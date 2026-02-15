import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { logger } from '../logger.js';
import { config } from '../config.js';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.path}` });
}

/** Wrap async route handlers so rejections are passed to error handler (Express 4 doesn't catch them). */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.statusCode ?? 500;
  const message = err.message || 'Something went wrong';
  logger.error(message, { stack: err.stack });
  const safeMessage =
    status >= 500 && config.env !== 'development'
      ? 'Something went wrong'
      : message;
  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : 'Error',
    message: safeMessage,
  });
}

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const messages = result.array().map((e: ValidationError) => e.msg ?? 'Invalid value');
    return res.status(400).json({ error: 'Validation failed', message: messages.join('; ') });
  }
  next();
}
