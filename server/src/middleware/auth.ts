import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { AppError } from '../utils/error.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('未登录', 401, 401));
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return next(new AppError('token 已失效', 401, 401));
  }
}