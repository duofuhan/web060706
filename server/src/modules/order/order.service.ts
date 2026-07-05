import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/error.js';
import { indexSoldItem } from '../ai/ai.service.js';

const querySchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'completed', 'canceled', 'refunded']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const orderService = {
  async list(userId: number, role: string, query: unknown) {
    const q = querySchema.parse(query);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (role === 'buyer') where.buyerId = userId;
    else if (role === 'seller') where.auction = { sellerId: userId };
    const [list, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          auction: { include: { item: true } },
          buyer: { select: { id: true, nickname: true } },
        },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  },

  async detail(id: number, userId: number, role: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { auction: { include: { item: true } }, buyer: true },
    });
    if (!order) throw new AppError('订单不存在', 404, 404);
    if (role === 'buyer' && order.buyerId !== userId) {
      throw new AppError('无权查看他人订单', 403, 403);
    }
    return order;
  },

  // 模拟支付 (课设阶段不接真实支付)
  async pay(id: number, userId: number) {
    const order = await prisma.order.findUnique({ where: { id }, include: { auction: { include: { item: true } } } });
    if (!order) throw new AppError('订单不存在', 404, 404);
    if (order.buyerId !== userId) throw new AppError('非本人订单', 403, 403);
    if (order.status !== 'pending') throw new AppError('订单状态不可支付');

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'paid', paymentTime: new Date() },
    });

    await indexSoldItem({
      itemId: order.auction.itemId,
      name: order.auction.item.name,
      category: order.auction.item.category ?? null,
      condition: order.auction.item.condition,
      finalPrice: Number(order.finalPrice),
      soldAt: new Date(),
    }).catch((e) => console.error('[RAG] 写入成交向量失败:', e.message));

    return updated;
  },

  async ship(id: number, userId: number, _role: string) {
    const order = await prisma.order.findUnique({ where: { id }, include: { auction: true } });
    if (!order) throw new AppError('订单不存在', 404, 404);
    if (order.auction.sellerId !== userId) throw new AppError('非卖家不可发货', 403, 403);
    if (order.status !== 'paid') throw new AppError('订单未支付,不可发货');
    return prisma.order.update({ where: { id }, data: { status: 'shipped', shippedAt: new Date() } });
  },

  async complete(id: number, userId: number) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new AppError('订单不存在', 404, 404);
    if (order.buyerId !== userId) throw new AppError('非买家不可确认收货', 403, 403);
    if (order.status !== 'shipped') throw new AppError('订单未发货,不可确认');
    return prisma.order.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } });
  },

  async cancel(id: number, userId: number, role: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new AppError('订单不存在', 404, 404);
    const isBuyer = order.buyerId === userId;
    const isAdmin = role === 'system_admin';
    if (!isBuyer && !isAdmin) throw new AppError('无权取消', 403, 403);
    if (!['pending', 'paid'].includes(order.status)) throw new AppError('当前状态不可取消');
    return prisma.order.update({ where: { id }, data: { status: 'canceled' } });
  },
};