import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode: number = err.statusCode || 500;
  let message: string = err.message || 'Something went wrong';

  if (err instanceof ZodError) {
    statusCode = 400;
    message = err.issues.map((i: any) => i.message).join(', ');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
  }

  if (statusCode === 500) {
    logger.error(`[500] ${err.message}`, err.stack);
  } else {
    logger.warn(`[${statusCode}] ${message}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 ? 'Internal server error' : message,
    data: null,
    timestamp: new Date().toISOString(),
    ...(!isProduction && statusCode === 500 && { stack: err.stack }),
  });
};
