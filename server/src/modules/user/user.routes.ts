import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { success } from '../../utils/response.js';
import { AppError } from '../../utils/error.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(64),
  role: z.enum(['seller', 'buyer']).default('buyer'),
  nickname: z.string().optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new AppError('用户名已被占用');
    const hashed = hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        username: input.username,
        password: hashed,
        role: input.role,
        nickname: input.nickname ?? input.username,
      },
      select: { id: true, username: true, role: true, nickname: true },
    });
    return success(res, { ...user, token: signToken({ userId: user.id, role: user.role }) }, '注册成功');
  } catch (e) {
    next(e);
  }
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user) throw new AppError('用户名或密码错误');
    if (user.status === 0) throw new AppError('账号已被禁用，请联系管理员');
    if (!comparePassword(input.password, user.password)) throw new AppError('用户名或密码错误');
    return success(res, {
      id: user.id,
      username: user.username,
      role: user.role,
      nickname: user.nickname,
      avatar: user.avatar,
      address: user.address,
      token: signToken({ userId: user.id, role: user.role }),
    }, '登录成功');
  } catch (e) {
    next(e);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('未登录', 401, 401);
    const u = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, username: true, role: true, nickname: true, avatar: true, address: true, createdAt: true },
    });
    if (!u) throw new AppError('用户不存在', 404, 404);
    return success(res, u);
  } catch (e) {
    next(e);
  }
});

const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatar: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(['seller', 'buyer']).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(64).optional(),
});

router.put('/me', auth, async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('未登录', 401, 401);
    const input = updateProfileSchema.parse(req.body);

    const data: any = {};
    if (input.nickname !== undefined) data.nickname = input.nickname;
    if (input.avatar !== undefined) data.avatar = input.avatar;
    if (input.address !== undefined) data.address = input.address;
    if (input.role !== undefined) data.role = input.role;

    if (input.newPassword) {
      if (!input.currentPassword) throw new AppError('请输入当前密码');
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user) throw new AppError('用户不存在', 404, 404);
      if (!comparePassword(input.currentPassword, user.password)) throw new AppError('当前密码错误');
      data.password = hashPassword(input.newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: { id: true, username: true, role: true, nickname: true, avatar: true, address: true },
    });

    return success(res, updated, '更新成功');
  } catch (e) {
    next(e);
  }
});

export default router;
