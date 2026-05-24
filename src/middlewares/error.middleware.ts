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
  const e = err as { statusCode?: number; message?: string; name?: string; stack?: string };

  let statusCode = e.statusCode ?? 500;
  let message = e.message ?? 'Something went wrong';

  if (err instanceof ZodError) {
    statusCode = 400;
    message = err.issues.map((i) => i.message).join(', ');
  }

  if (e.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  if (e.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
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

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 ? 'Internal server error' : message,
    data: null,
    timestamp: new Date().toISOString(),
    ...(!isProduction && statusCode === 500 && { stack: e.stack }),
  });
};
