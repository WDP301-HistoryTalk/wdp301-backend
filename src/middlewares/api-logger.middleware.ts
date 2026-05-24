import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const apiLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Capture response finish - only log errors
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      // Error response
      logger.api.error(method, originalUrl, statusCode, res.locals.error || 'Request failed', duration);
    }
  });

  // Capture response error
  res.on('error', (error: Error) => {
    const duration = Date.now() - start;
    logger.api.error(method, originalUrl, res.statusCode || 500, error, duration);
  });

  next();
};
