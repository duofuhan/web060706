import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/error.js';
import { hashPassword } from '../../utils/password.js';

const userQuerySchema = z.object({
  role: z.string().optional(),
  status: z.coerce.number().optional(),
  keyword: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const createUserSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6),
  role: z.enum(['seller', 'buyer', 'auction_admin', 'system_admin']),
  nickname: z.string().optional(),
});

const updateUserSchema = z.object({
  nickname: z.string().optional(),
  role: z.enum(['seller', 'buyer', 'auction_admin', 'system_admin']).optional(),
  status: z.coerce.number().optional(),
  password: z.string().optional(),
});

export const adminService = {
  // 数据看板
  async stats() {
    const [users, items, auctionsLive, orders] = await Promise.all([
      prisma.user.count(),
      prisma.item.count({ where: { status: 'approved' } }),
      prisma.auction.count({ where: { status: 'live' } }),
      prisma.order.count({ where: { status: 'completed' } }),
    ]);
    const settledOrders = await prisma.order.aggregate({
      where: { status: 'completed' },
      _sum: { finalPrice: true },
    });
    const pendingItems = await prisma.item.count({ where: { status: 'pending' } });
    return {
      users,
      itemsApproved: items,
      auctionsLive,
      ordersCompleted: orders,
      settledAmount: Number(settledOrders._sum.finalPrice ?? 0),
      pendingItems,
    };
  },

  // 用户管理
  async listUsers(query: unknown) {
    const q = userQuerySchema.parse(query);
    const where: any = {};
    if (q.role) where.role = q.role;
    if (q.status !== undefined) where.status = q.status;
    if (q.keyword) where.username = { contains: q.keyword, mode: 'insensitive' };
    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, username: true, nickname: true, role: true, status: true, createdAt: true },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  },

  async createUser(body: unknown) {
    const input = createUserSchema.parse(body);
    const exists = await prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new AppError('用户名已被占用');
    return prisma.user.create({
      data: {
        username: input.username,
        password: hashPassword(input.password),
        role: input.role,
        nickname: input.nickname ?? input.username,
      },
      select: { id: true, username: true, role: true, nickname: true },
    });
  },

  async updateUser(id: number, body: unknown) {
    const input = updateUserSchema.parse(body);
    const data: any = {};
    if (input.nickname) data.nickname = input.nickname;
    if (input.role) data.role = input.role;
    if (input.status !== undefined) data.status = input.status;
    if (input.password) data.password = hashPassword(input.password);
    return prisma.user.update({ where: { id }, data, select: { id: true, username: true, role: true, nickname: true, status: true } });
  },

  async deleteUser(id: number) {
    return prisma.user.update({ where: { id }, data: { status: 0 } });
  },

  // 拍品审核列表
  async pendingItems() {
    return prisma.item.findMany({
      where: { status: 'pending' },
      include: { seller: { select: { id: true, nickname: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  // 拍品列表(含订单发货状态)
  async listItems(query: { pageSize?: number }) {
    const take = Number(query.pageSize ?? 50);
    const items = await prisma.item.findMany({
      where: { status: { notIn: ['draft', 'pending'] } },
      include: {
        seller: { select: { id: true, nickname: true } },
        auction: { select: { id: true, status: true, order: { select: { status: true, shippedAt: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return items;
  },

  // 拍卖场次列表
  async listAuctions(query: any) {
    const status = query.status;
    const where: any = {};
    if (status) where.status = status;
    return prisma.auction.findMany({
      where,
      include: {
        item: true,
        seller: { select: { id: true, nickname: true, username: true } },
        winner: { select: { id: true, nickname: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  },

  // 操作日志
  async logs(query: any) {
    const take = Number(query.pageSize ?? 20);
    const skip = (Number(query.page ?? 1) - 1) * take;
    const [list, total] = await Promise.all([
      prisma.operationLog.findMany({ orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.operationLog.count(),
    ]);
    return { list, total, page: Number(query.page ?? 1), pageSize: take };
  },
};