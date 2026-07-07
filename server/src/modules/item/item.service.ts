import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/error.js';

const itemStatus = ['draft', 'pending', 'approved', 'rejected', 'removed'] as const;

const createSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().optional(),
  condition: z.string().min(1),
  originPrice: z.coerce.number().nonnegative(),
  startPrice: z.coerce.number().positive(),
  reservePrice: z.coerce.number().optional(),
  description: z.string().optional().default(''),
  images: z.array(z.string()).default([]),
  submitForReview: z.boolean().default(false),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  status: z.enum(itemStatus).optional(),
  sellerId: z.coerce.number().optional(),
  category: z.string().optional(),
  keyword: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const reviewSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional(),
});

export const itemService = {
  async create(sellerId: number, body: unknown) {
    const input = createSchema.parse(body);
    return prisma.item.create({
      data: {
        sellerId,
        name: input.name,
        category: input.category ?? null,
        condition: input.condition,
        originPrice: input.originPrice,
        startPrice: input.startPrice,
        reservePrice: input.reservePrice ?? null,
        description: input.description,
        images: input.images,
        status: input.submitForReview ? 'pending' : 'draft',
      },
    });
  },

  async list(query: unknown) {
    const q = querySchema.parse(query);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.sellerId) where.sellerId = q.sellerId;
    if (q.category) where.category = q.category;
    if (q.keyword) where.name = { contains: q.keyword, mode: 'insensitive' };
    const [list, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: { seller: { select: { id: true, nickname: true, avatar: true } } },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  },

  async detail(id: number) {
    const item = await prisma.item.findUnique({
      where: { id },
      include: { seller: { select: { id: true, nickname: true, avatar: true } } },
    });
    if (!item) throw new AppError('拍品不存在', 404, 404);
    return item;
  },

  async update(id: number, sellerId: number, body: unknown) {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) throw new AppError('拍品不存在', 404, 404);
    if (item.sellerId !== sellerId) throw new AppError('无权修改他人拍品', 403, 403);
    const input = updateSchema.parse(body);
    const { submitForReview, ...data } = input as any;
    if (submitForReview) {
      return prisma.item.update({ where: { id }, data: { ...data, status: 'pending' } });
    }
    return prisma.item.update({ where: { id }, data });
  },

  async delete(id: number, sellerId: number, role: string) {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) throw new AppError('拍品不存在', 404, 404);
    if (item.sellerId !== sellerId && role !== 'system_admin') {
      throw new AppError('无权删除', 403, 403);
    }
    const active = await prisma.auction.findFirst({
      where: { itemId: id, status: { in: ['scheduled', 'live'] } },
    });
    if (active) throw new AppError('该拍品有进行中的拍卖场次,无法删除');
    return prisma.item.update({ where: { id }, data: { status: 'removed' } });
  },

  async review(id: number, body: unknown) {
    const input = reviewSchema.parse(body);
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) throw new AppError('拍品不存在', 404, 404);
    if (item.status !== 'pending' && item.status !== 'approved' && item.status !== 'rejected') {
      throw new AppError('当前状态不可审核');
    }
    return prisma.item.update({
      where: { id },
      data: {
        status: input.approved ? 'approved' : 'rejected',
        rejectReason: input.approved ? null : (input.reason ?? '审核未通过'),
      },
    });
  },

  async listMine(sellerId: number, query: unknown) {
    const q = querySchema.parse(query);
    const where: any = { sellerId };
    if (q.status) where.status = q.status;
    const [list, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: { auction: { select: { id: true, status: true } } },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  },
};