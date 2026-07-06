import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { AppError } from '../utils/error.js';
import { prisma } from '../db/prisma.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export async function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('未登录', 401, 401));
  }
  try {
    req.user = verifyToken(header.slice(7));
    const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { status: true } });
    if (!u || u.status === 0) {
      return next(new AppError('账号已被禁用', 401, 401));
    }
    next();
  } catch (e) {
    if (e instanceof AppError) return next(e);
    return next(new AppError('token 已失效', 401, 401));
  }
}