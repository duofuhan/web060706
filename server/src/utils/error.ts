export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode = 400,
    public code = 1,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}