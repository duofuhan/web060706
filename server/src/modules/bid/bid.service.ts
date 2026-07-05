import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { redis } from '../../db/redis.js';
import { AppError } from '../../utils/error.js';

const bidSchema = z.object({
  auctionId: z.coerce.number(),
  amount: z.coerce.number().positive(),
});

export const bidService = {
  async placeBid(userId: number, body: unknown) {
    const input = bidSchema.parse(body);
    const auction = await prisma.auction.findUnique({
      where: { id: input.auctionId },
      include: { item: true },
    });
    if (!auction) throw new AppError('拍卖场次不存在', 404, 404);
    if (auction.status !== 'live') throw new AppError('当前拍卖未在进行中');
    if (auction.sellerId === userId) throw new AppError('卖家不可参与自己的拍卖');

    if (input.amount < Number(auction.currentPrice) + Number(auction.minIncrement)) {
      throw new AppError(
        `出价必须 ≥ ¥${Number(auction.currentPrice) + Number(auction.minIncrement)} (当前价 + 加价幅度 ¥${auction.minIncrement})`,
      );
    }

    const prevMax = await prisma.bid.findFirst({
      where: { auctionId: input.auctionId, status: { in: ['active', 'winning'] } },
      orderBy: { amount: 'desc' },
    });

    const bid = await prisma.bid.create({
      data: { auctionId: input.auctionId, userId, amount: input.amount, status: 'active' },
    });

    if (prevMax && Number(prevMax.amount) < input.amount) {
      await prisma.bid.update({ where: { id: prevMax.id }, data: { status: 'outbid' } });
    }

    await prisma.auction.update({
      where: { id: input.auctionId },
      data: { currentPrice: input.amount },
    });

    await redis.zadd(`auction:${input.auctionId}:ranking`, input.amount, String(userId));
    await redis.set(
      `auction:${input.auctionId}:winner`,
      JSON.stringify({ userId, amount: input.amount, time: Date.now() }),
    );

    return { bid, currentPrice: input.amount };
  },

  async listByAuction(auctionId: number, limit = 20) {
    return prisma.bid.findMany({
      where: { auctionId },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
      orderBy: { amount: 'desc' },
      take: limit,
    });
  },

  async myBids(userId: number) {
    return prisma.bid.findMany({
      where: { userId },
      include: { auction: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },
};