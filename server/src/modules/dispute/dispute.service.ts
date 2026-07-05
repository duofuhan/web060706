import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/error.js';

const createSchema = z.object({
  auctionId: z.coerce.number(),
  reason: z.string().min(5).max(500),
});

const handleSchema = z.object({
  approved: z.boolean(),
  resolution: z.string().optional(),
});

const querySchema = z.object({
  status: z.enum(['open', 'processing', 'resolved', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const disputeService = {
  async create(userId: number, body: unknown) {
    const input = createSchema.parse(body);
    const auction = await prisma.auction.findUnique({
      where: { id: input.auctionId },
      include: { item: true, order: true },
    });
    if (!auction) throw new AppError('拍卖场次不存在', 404, 404);
    const isSeller = auction.sellerId === userId;
    const isBuyer = auction.winnerId === userId;
    if (!isSeller && !isBuyer) {
      throw new AppError('只有该场次的卖家或买家中标者可发起争议', 403, 403);
    }
    if (auction.status !== 'settled') {
      throw new AppError('只有已成交的拍卖可发起争议');
    }
    const existing = await prisma.dispute.findFirst({
      where: { auctionId: input.auctionId, status: { in: ['open', 'processing'] } },
    });
    if (existing) throw new AppError('该拍卖已有未解决的争议');
    return prisma.dispute.create({
      data: {
        auctionId: input.auctionId,
        openedBy: userId,
        reason: input.reason,
        status: 'open',
      },
      include: { auction: { include: { item: true } }, opener: { select: { id: true, nickname: true } } },
    });
  },

  async list(query: unknown) {
    const q = querySchema.parse(query);
    const where: any = {};
    if (q.status) where.status = q.status;
    const [list, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          auction: { include: { item: true } },
          opener: { select: { id: true, nickname: true, role: true } },
          handler: { select: { id: true, nickname: true } },
        },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dispute.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  },

  async detail(id: number) {
    const d = await prisma.dispute.findUnique({
      where: { id },
      include: {
        auction: { include: { item: true, seller: { select: { id: true, nickname: true } }, winner: { select: { id: true, nickname: true } }, order: true } },
        opener: { select: { id: true, nickname: true, role: true } },
        handler: { select: { id: true, nickname: true } },
      },
    });
    if (!d) throw new AppError('争议不存在', 404, 404);
    return d;
  },

  async take(id: number, handlerId: number) {
    const d = await prisma.dispute.findUnique({ where: { id } });
    if (!d) throw new AppError('争议不存在', 404, 404);
    if (d.status !== 'open') throw new AppError('该争议已被处理或正在处理中');
    return prisma.dispute.update({
      where: { id },
      data: { status: 'processing', handledBy: handlerId },
    });
  },

  async resolve(id: number, handlerId: number, body: unknown) {
    const input = handleSchema.parse(body);
    const d = await prisma.dispute.findUnique({ where: { id } });
    if (!d) throw new AppError('争议不存在', 404, 404);
    if (d.status !== 'open' && d.status !== 'processing') {
      throw new AppError('该争议状态不可解决');
    }
    return prisma.dispute.update({
      where: { id },
      data: {
        status: input.approved ? 'resolved' : 'rejected',
        resolution: input.resolution ?? (input.approved ? '已支持争议方诉求' : '已驳回争议'),
        handledBy: handlerId,
        resolvedAt: new Date(),
      },
    });
  },
};