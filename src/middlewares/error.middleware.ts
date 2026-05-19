import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Something went wrong';
  let errors = err.errors || null;

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    status = 'fail';
    message = 'Validation failed';
    errors = err.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }

  // Handle JWT specific errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    status = 'fail';
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    status = 'fail';
    message = 'Your token has expired. Please log in again.';
  }

  // Log all errors
  if (statusCode === 500) {
    logger.error(`Unhandled Exception: ${err.message}`, err);
  } else {
    logger.warn(`Operational Error: [${statusCode}] ${message}`, errors || '');
  }

  // In production, keep 500 error messages generic to avoid leaking server data
  const isProduction = process.env.NODE_ENV === 'production';
  const responseMessage = isProduction && statusCode === 500 
    ? 'Internal server error' 
    : message;

  res.status(statusCode).json({
    status,
    message: responseMessage,
    ...(errors && { errors }),
    ...(!isProduction && statusCode === 500 && { stack: err.stack }),
  });
};
