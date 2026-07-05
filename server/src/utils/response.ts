import type { Response } from 'express';

export function success<T>(res: Response, data: T, message = '操作成功') {
  return res.json({ code: 0, message, data });
}

export function fail(res: Response, message: string, code = 1, status = 400) {
  return res.status(status).json({ code, message, data: null });
}

export function paginate<T>(list: T[], total: number, page: number, pageSize: number) {
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}