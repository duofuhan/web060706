import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { chatCompletion, createEmbedding } from '../../ai/client.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/error.js';

const optimizeSchema = z.object({
  name: z.string().min(1),
  condition: z.string().min(1),
  originPrice: z.coerce.number().nonnegative(),
  itemId: z.coerce.number().optional(),
  extra: z.string().optional(),
});

const SYSTEM_PROMPT = `你是一位专业的电商商品文案撰写专家，擅长为拍卖商品撰写突出卖点、吸引竞拍的介绍文案。
请根据卖家提供的拍品名称、成色、原价等信息，生成一段 200-400 字的中文商品介绍文案。
要求：
1. 突出拍品的核心卖点和独特价值
2. 描述真实客观，不夸大宣传
3. 体现性价比，激发买家竞拍欲望
4. 直接输出文案正文，不要包含 "以下是文案" 之类的引导语或解释
5. 不要使用 markdown 标题语法`;

export async function optimizeDescription(userId: number, body: unknown): Promise<{
  description: string;
  model: string;
}> {
  const input = optimizeSchema.parse(body);

  const userPrompt = [
    `拍品名称: ${input.name}`,
    `成色: ${input.condition}`,
    `原价: ¥${input.originPrice}`,
    input.extra ? `补充信息: ${input.extra}` : '',
  ].filter(Boolean).join('\n');

  const res: any = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 800 },
  );

  const description = res.choices?.[0]?.message?.content?.trim() || '';
  if (!description) throw new AppError('AI 未生成有效文案');

  await prisma.aiDescriptionHistory.create({
    data: {
      userId,
      itemId: input.itemId ?? null,
      rawInput: {
        name: input.name,
        condition: input.condition,
        originPrice: input.originPrice,
        extra: input.extra ?? null,
      } as any,
      output: description,
      model: env.OPENAI_MODEL,
    },
  });

  return { description, model: env.OPENAI_MODEL };
}

// ============ RAG 估价助手(进阶任务) ============

const valuationSchema = z.object({
  itemId: z.coerce.number().optional(),
  query: z.string().min(1),
  sessionId: z.coerce.number().optional(),
});

export async function valuationAssistant(userId: number, body: unknown) {
  const input = valuationSchema.parse(body);

  let session = input.sessionId
    ? await prisma.aiValuationSession.findUnique({ where: { id: input.sessionId } })
    : null;
  if (!session) {
    session = await prisma.aiValuationSession.create({
      data: {
        userId,
        itemId: input.itemId ?? null,
        title: input.query.slice(0, 50),
        messages: [
          { role: 'system', content: VALUATION_SYSTEM_PROMPT },
          { role: 'user', content: input.query },
        ] as any,
      },
    });
  } else {
    const msgs = (session.messages as any[]) ?? [];
    msgs.push({ role: 'user', content: input.query });
    session = await prisma.aiValuationSession.update({
      where: { id: session.id },
      data: { messages: msgs as any },
    });
  }

  const messages = (session.messages as any[]) ?? [];
  const itemInfo = input.itemId ? await prisma.item.findUnique({ where: { id: input.itemId } }) : null;

  // 1. 将查询向量化,检索同类历史成交
  const queryVec = (await createEmbedding(input.query))[0];
  const vecStr = `[${queryVec.join(',')}]`;
  const category = itemInfo?.category ?? null;
  const categoryClause = category ? `AND category = $3` : '';
  const params: any[] = [vecStr, 5];
  if (category) params.push(category);
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, name, category, condition, "finalPrice"::text, "soldAt",
            (embedding <=> $1::vector) AS distance
     FROM "SoldItemEmbedding"
     WHERE 1=1 ${categoryClause}
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    ...params,
  );

  const history = rows.map((r: any) => ({
    name: r.name,
    category: r.category,
    cond: r.condition,
    price: Number(r.finalprice ?? r.finalPrice),
    soldAt: r.soldat ?? r.soldAt,
    similarity: 1 - Number(r.distance),
  }));

  const context = history.length
    ? `\n\n已检索到 ${history.length} 条近期同类成交参考:\n` +
      history
        .map((h, i) => `${i + 1}. ${h.name} (${h.cond}, ${h.category ?? '未分类'}) 成交价 ¥${h.price}`)
        .join('\n')
    : '\n\n(暂无近期同类成交历史参考,请基于一般经验分析)';

  const enrichedUserMsg = `拍品信息: ${itemInfo ? `${itemInfo.name} | 成色 ${itemInfo.condition} | 起拍价 ¥${itemInfo.startPrice}` : '(未关联具体拍品)'}\n\n卖家问题: ${input.query}\n${context}`;

  // 构造新一轮对话: 保留前面的 system + user,最后追加本次增强消息给模型
  const finalMessages: any[] = [{ role: 'system', content: VALUATION_SYSTEM_PROMPT }];
  for (const m of messages) {
    if (m.role === 'user' && m === messages[messages.length - 1]) continue;
    finalMessages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }
  finalMessages.push({ role: 'user', content: enrichedUserMsg });

  const res: any = await chatCompletion(finalMessages, { temperature: 0.3, maxTokens: 1024 });
  const reply = res.choices?.[0]?.message?.content?.trim() || '抱歉,暂时无法生成估价建议。';

  finalMessages.push({ role: 'assistant', content: reply });
  await prisma.aiValuationSession.update({
    where: { id: session.id },
    data: { messages: finalMessages as any, recommendations: { history, model: env.EMBEDDING_MODEL } as any },
  });

  return {
    sessionId: session.id,
    reply,
    references: history,
  };
}

const VALUATION_SYSTEM_PROMPT = `你是一位资深的拍卖估价师助手，能基于历史成交数据为卖家提供专业的拍品定价建议。
你的任务：
1. 分析检索到的同类历史成交价格区间
2. 结合拍品成色、原价、市场行情给出起拍价建议区间
3. 给出三种定价策略分析：保守起拍、合理起拍、激进起拍，及其各自的成交概率说明
4. 支持多轮对话，回答卖家的追问
输出语言：中文，结构清晰，可用 markdown 列表或表格`;

// 卖家确认后写入成交历史向量 (拍卖结束时也会自动写入)
export async function indexSoldItem(item: {
  itemId: number;
  name: string;
  category: string | null;
  condition: string;
  finalPrice: number;
  soldAt: Date;
}) {
  const input = `${item.name} ${item.category ?? ''} ${item.condition}`;
  const vec = (await createEmbedding(input))[0];
  await prisma.$executeRaw`
    INSERT INTO "SoldItemEmbedding"
      ("itemId", name, category, condition, "finalPrice", "soldAt", embedding, "createdAt")
    VALUES
      (${item.itemId}, ${item.name}, ${item.category ?? ''}, ${item.condition},
       ${item.finalPrice}, ${item.soldAt}, ${vec}::vector, NOW())
  `;
}