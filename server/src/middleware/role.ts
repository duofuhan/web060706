import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error.js';

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('未登录', 401, 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('无权限访问', 403, 403));
    }
    next();
  };
}