import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';

// 需要记录的关键操作 (按路径前缀和 method 匹配)
const trackedActions: { method: string; pathPattern: RegExp; action: string }[] = [
  { method: 'POST', pathPattern: /^\/api\/items\/\d+\/review$/, action: 'review_item' },
  { method: 'POST', pathPattern: /^\/api\/admin\/users$/, action: 'create_user' },
  { method: 'PUT', pathPattern: /^\/api\/admin\/users\/\d+$/, action: 'update_user' },
  { method: 'DELETE', pathPattern: /^\/api\/admin\/users\/\d+$/, action: 'disable_user' },
  { method: 'POST', pathPattern: /^\/api\/admin\/auctions\/\d+\/force-end$/, action: 'force_end_auction' },
  { method: 'POST', pathPattern: /^\/api\/admin\/auctions\/\d+\/force-cancel$/, action: 'force_cancel_auction' },
  { method: 'POST', pathPattern: /^\/api\/disputes$/, action: 'create_dispute' },
  { method: 'POST', pathPattern: /^\/api\/disputes\/\d+\/resolve$/, action: 'resolve_dispute' },
  { method: 'PUT', pathPattern: /^\/api\/admin\/config\/.+$/, action: 'update_config' },
];

export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') return next();
  const match = trackedActions.find(
    (t) => t.method === req.method && t.pathPattern.test(req.path),
  );
  if (!match) return next();
  const origEnd = res.end.bind(res);
  res.end = function (chunk?: any, ...rest: any[]) {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      prisma.operationLog
        .create({
          data: {
            userId: req.user.userId,
            action: match.action,
            target: `${req.method} ${req.path}`,
            ip: req.ip,
            detail: safeBody(req.body),
          },
        })
        .catch((e) => console.error('[Audit] 写入日志失败:', e.message));
    }
    return origEnd(chunk, ...rest);
  } as any;
  next();
}

function safeBody(body: any) {
  if (!body || typeof body !== 'object') return undefined;
  const { password, ...rest } = body;
  return rest as any;
}