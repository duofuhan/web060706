import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createEmbedding } from '../src/ai/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

interface SampleItem {
  itemId: number;
  name: string;
  category: string;
  condition: string;
  finalPrice: number;
}

const samples: SampleItem[] = [
  // 手机
  { itemId: 1001, name: 'iPhone 16 Pro Max 512GB', category: '数码', condition: '99新', finalPrice: 8800 },
  { itemId: 1002, name: 'iPhone 15 128GB', category: '数码', condition: '9成新', finalPrice: 3800 },
  { itemId: 1003, name: 'iPhone 14 Pro 256GB', category: '数码', condition: '95新', finalPrice: 4500 },
  { itemId: 1004, name: '华为 Mate 60 Pro 512GB', category: '数码', condition: '全新', finalPrice: 6200 },
  { itemId: 1005, name: '三星 S24 Ultra 256GB', category: '数码', condition: '95新', finalPrice: 5200 },
  { itemId: 1006, name: '小米 14 Ultra 512GB', category: '数码', condition: '99新', finalPrice: 4800 },
  // 笔记本
  { itemId: 2001, name: 'MacBook Air M3 16GB 512GB', category: '数码', condition: '95新', finalPrice: 7500 },
  { itemId: 2002, name: 'MacBook Pro 14 M3 Pro 18GB', category: '数码', condition: '99新', finalPrice: 12000 },
  { itemId: 2003, name: 'ThinkPad X1 Carbon Gen 11', category: '数码', condition: '9成新', finalPrice: 5500 },
  // 相机
  { itemId: 3001, name: '索尼 A7M4 相机机身', category: '数码', condition: '95新', finalPrice: 11000 },
  { itemId: 3002, name: '佳能 EOS R6 Mark II', category: '数码', condition: '99新', finalPrice: 13500 },
  { itemId: 3003, name: '富士 X-T5 机身', category: '数码', condition: '95新', finalPrice: 9800 },
  // 奢侈品
  { itemId: 4001, name: 'LV Neverfull 中号手袋', category: '奢侈品', condition: '95新', finalPrice: 9800 },
  { itemId: 4002, name: 'Chanel Classic Flap 中号', category: '奢侈品', condition: '9成新', finalPrice: 28000 },
  { itemId: 4003, name: 'Rolex Submariner 绿水鬼', category: '奢侈品', condition: '95新', finalPrice: 68000 },
  // 家电
  { itemId: 5001, name: '戴森 V15 无线吸尘器', category: '家电', condition: '95新', finalPrice: 2200 },
  { itemId: 5002, name: '索尼 WH-1000XM5 耳机', category: '家电', condition: '99新', finalPrice: 1800 },
  { itemId: 5003, name: '苹果 HomePod mini', category: '家电', condition: '全新', finalPrice: 650 },
  // 游戏/娱乐
  { itemId: 6001, name: 'PS5 光驱版 国行', category: '数码', condition: '95新', finalPrice: 2800 },
  { itemId: 6002, name: '任天堂 Switch OLED', category: '数码', condition: '9成新', finalPrice: 1500 },
  // 服饰
  { itemId: 7001, name: '加拿大鹅 Expedition 外套', category: '服饰', condition: '95新', finalPrice: 6500 },
  { itemId: 7002, name: 'Air Jordan 1 Retro High OG', category: '服饰', condition: '95新', finalPrice: 1800 },
];

async function main() {
  console.log('🌱 种子向量数据...');

  const existing = await prisma.soldItemEmbedding.count();
  if (existing > 1) {
    console.log(`  已存在 ${existing} 条向量数据，跳过`);
    return;
  }

  let count = 0;
  for (const s of samples) {
    const exists = await prisma.soldItemEmbedding.findFirst({ where: { itemId: s.itemId } });
    if (exists) continue;

    const input = `${s.name} ${s.category} ${s.condition}`;
    try {
      const vec = (await createEmbedding(input))[0];
      const vecStr = `[${vec.join(',')}]`;
      await prisma.$executeRaw`
        INSERT INTO "SoldItemEmbedding"
          ("itemId", name, category, condition, "finalPrice", "soldAt", embedding, "createdAt")
        VALUES
          (${s.itemId}, ${s.name}, ${s.category}, ${s.condition},
           ${s.finalPrice}, NOW(), ${vecStr}::vector, NOW())
      `;
      count++;
      console.log(`  + ${s.name} (${s.category}) ¥${s.finalPrice}`);
    } catch (e: any) {
      console.error(`  ⚠️ ${s.name} 失败: ${e.message}`);
    }
  }

  console.log(`✅ 写入 ${count} 条向量数据`);
  const total = await prisma.soldItemEmbedding.count();
  console.log(`📊 SoldItemEmbedding 总数: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
