import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { redis } from '../../db/redis.js';
import { AppError } from '../../utils/error.js';

const createSchema = z.object({
  itemId: z.coerce.number(),
  type: z.enum(['ascending', 'sealed', 'descending']).default('ascending'),
  startPrice: z.coerce.number().positive().optional(),
  reservePrice: z.coerce.number().nonnegative().optional(),
  minIncrement: z.coerce.number().positive().default(50),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMinutes: z.coerce.number().int().positive().max(1440).optional(),
});

const querySchema = z.object({
  status: z.enum(['scheduled', 'live', 'ended', 'canceled', 'settled']).optional(),
  sellerId: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const auctionService = {
  async create(sellerId: number, body: unknown) {
    const input = createSchema.parse(body);
    const item = await prisma.item.findUnique({ where: { id: input.itemId } });
    if (!item) throw new AppError('拍品不存在', 404, 404);
    if (item.sellerId !== sellerId) throw new AppError('只能发布自己的拍品', 403, 403);
    if (item.status !== 'approved') throw new AppError('拍品未通过审核,不可拍卖');
    const existing = await prisma.auction.findUnique({ where: { itemId: input.itemId } });
    if (existing) throw new AppError('该拍品已存在拍卖场次');

    let start = new Date(input.startTime);
    let end = new Date(input.endTime);
    if (input.durationMinutes && !input.endTime) {
      end = new Date(start.getTime() + input.durationMinutes * 60_000);
    }
    if (end <= start) throw new AppError('结束时间必须晚于开始时间');

    const startPrice = input.startPrice ?? Number(item.startPrice);
    return prisma.auction.create({
      data: {
        sellerId,
        itemId: input.itemId,
        type: input.type,
        startPrice,
        currentPrice: startPrice,
        minIncrement: input.minIncrement,
        startTime: start,
        endTime: end,
        status: 'scheduled',
      },
      include: { item: true },
    });
  },

  async list(query: unknown) {
    const q = querySchema.parse(query);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.sellerId) where.sellerId = q.sellerId;
    const [list, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        include: { item: true, seller: { select: { id: true, nickname: true } } },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { startTime: 'desc' },
      }),
      prisma.auction.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  },

  async detail(id: number) {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        item: true,
        seller: { select: { id: true, nickname: true, avatar: true } },
        bids: { include: { user: { select: { id: true, nickname: true } } }, orderBy: { amount: 'desc' }, take: 10 },
      },
    });
    if (!auction) throw new AppError('拍卖场次不存在', 404, 404);
    return auction;
  },

  async cancel(id: number, userId: number, role: string) {
    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) throw new AppError('拍卖场次不存在', 404, 404);
    if (auction.sellerId !== userId && role !== 'system_admin') throw new AppError('无权取消', 403, 403);
    if (auction.status === 'live') throw new AppError('进行中的拍卖不可取消,请联系管理员');
    if (auction.status === 'settled') throw new AppError('已成交的拍卖不可取消');
    return prisma.auction.update({ where: { id }, data: { status: 'canceled' } });
  },

  // 拍卖管理员强制结束进行中的拍卖(无中标则流拍,有中标则成交)
  async forceEnd(id: number, adminId: number) {
    const auction = await prisma.auction.findUnique({ where: { id }, include: { item: true } });
    if (!auction) throw new AppError('拍卖场次不存在', 404, 404);
    if (auction.status !== 'live') throw new AppError('只有进行中的拍卖可强制结束');

    const topBid = await prisma.bid.findFirst({
      where: { auctionId: id, status: { in: ['active', 'winning'] } },
      orderBy: { amount: 'desc' },
    });

    let resultStatus: string;
    if (topBid) {
      const finalPrice = topBid.amount;
      await prisma.$transaction([
        prisma.auction.update({ where: { id }, data: { status: 'settled', winnerId: topBid.userId, currentPrice: finalPrice } }),
        prisma.bid.update({ where: { id: topBid.id }, data: { status: 'winning', isMax: true } }),
        prisma.bid.updateMany({ where: { auctionId: id, id: { not: topBid.id } }, data: { status: 'outbid' } }),
        prisma.order.create({ data: { auctionId: id, buyerId: topBid.userId, finalPrice, status: 'pending' } }),
      ]);
      resultStatus = 'settled';
    } else {
      await prisma.auction.update({ where: { id }, data: { status: 'ended' } });
      resultStatus = 'ended';
    }

    await prisma.operationLog.create({
      data: {
        userId: adminId,
        action: 'force_end_auction',
        target: `auction:${id}`,
        detail: { auctionId: id, prevStatus: 'live', result: resultStatus } as any,
      },
    });

    return prisma.auction.findUnique({ where: { id } });
  },

  // 拍卖管理员强制取消进行中的拍卖(无论是否有出价)
  async forceCancel(id: number, adminId: number, reason: string) {
    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) throw new AppError('拍卖场次不存在', 404, 404);
    if (!['scheduled', 'live'].includes(auction.status)) {
      throw new AppError('只有待开始或进行中的拍卖可强制取消');
    }
    const updated = await prisma.auction.update({ where: { id }, data: { status: 'canceled' } });
    await prisma.operationLog.create({
      data: {
        userId: adminId,
        action: 'force_cancel_auction',
        target: `auction:${id}`,
        detail: { auctionId: id, reason } as any,
      },
    });
    return updated;
  },

  // 定时任务: 把 scheduled 且已到开始时间的场次状态置为 live
  async startScheduledAuctions() {
    const now = new Date();
    const result = await prisma.auction.updateMany({
      where: { status: 'scheduled', startTime: { lte: now } },
      data: { status: 'live' },
    });
    return result.count;
  },

  // 定时任务: 结束到场拍卖场次,产生中标者与订单
  async endExpiredAuctions() {
    const now = new Date();
    const toEnd = await prisma.auction.findMany({
      where: { status: 'live', endTime: { lte: now } },
      include: { item: true },
    });
    for (const a of toEnd) {
      const bids = await prisma.bid.findMany({
        where: { auctionId: a.id, status: { in: ['active', 'winning'] } },
        orderBy: { amount: 'desc' },
        take: 1,
      });
      if (bids.length > 0) {
        const winning = bids[0];
        await prisma.$transaction([
          prisma.auction.update({
            where: { id: a.id },
            data: { status: 'settled', winnerId: winning.userId },
          }),
          prisma.bid.update({
            where: { id: winning.id },
            data: { status: 'winning', isMax: true },
          }),
          prisma.bid.updateMany({
            where: { auctionId: a.id, id: { not: winning.id } },
            data: { status: 'outbid' },
          }),
          prisma.order.create({
            data: {
              auctionId: a.id,
              buyerId: winning.userId,
              finalPrice: winning.amount,
              status: 'pending',
            },
          }),
        ]);
        await redis.del(`auction:${a.id}:winner`, `auction:${a.id}:ranking`);
      } else {
        await prisma.auction.update({
          where: { id: a.id },
          data: { status: 'ended' },
        });
      }
    }
    return toEnd.length;
  },
};