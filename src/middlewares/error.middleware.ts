import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import chalk from 'chalk';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const e = err as { statusCode?: number; message?: string; name?: string; stack?: string; errorCode?: string };

  let statusCode = e.statusCode ?? 500;
  let message = e.message ?? 'Something went wrong';

  let errorCode: string | null = e.errorCode ?? null;
  let validationErrors: { field: string; message: string }[] | null = null;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    validationErrors = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
  }

  if (e.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
    errorCode = 'AUTH_INVALID_TOKEN';
  }

  if (e.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
    errorCode = 'AUTH_TOKEN_EXPIRED';
  }

  // Store error for apiLogger middleware
  res.locals.error = err;

  // Enhanced error logging with chalk
  if (statusCode === 500) {
    logger.error(
      chalk.bgRed.white(` [${statusCode}] `) + ' ' + chalk.red(e.message),
      e.stack,
      chalk.gray(`→ ${req.method} ${req.originalUrl}`)
    );
  } else if (statusCode >= 400) {
    logger.warn(
      chalk.bgYellow.black(` [${statusCode}] `) + ' ' + chalk.yellow(message),
      chalk.gray(`→ ${req.method} ${req.originalUrl}`)
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (validationErrors) {
    res.status(statusCode).json({
      success: false,
      message,
      errors: validationErrors,
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 ? 'Internal server error' : message,
    data: null,
    timestamp: new Date().toISOString(),
    errorCode,
    ...(!isProduction && statusCode === 500 && { stack: e.stack }),
  });
};
