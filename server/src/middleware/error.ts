import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isAppError } from '../utils/error.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (isAppError(err)) {
    return res.status(err.statusCode).json({ code: err.code, message: err.message, data: null });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 422,
      message: '参数校验失败',
      data: err.flatten().fieldErrors,
    });
  }
  console.error('[未处理错误]', err);
  return res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
};