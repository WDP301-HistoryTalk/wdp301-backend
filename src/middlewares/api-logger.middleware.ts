import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const apiLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, originalUrl, body } = req;

  // Log request
  logger.api.request(method, originalUrl, body);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      // Error response
      logger.api.error(method, originalUrl, statusCode, res.locals.error || 'Request failed', duration);
    } else {
      // Success response
      logger.api.response(method, originalUrl, statusCode, duration);
    }
  });

  // Capture response error
  res.on('error', (error: Error) => {
    const duration = Date.now() - start;
    logger.api.error(method, originalUrl, res.statusCode || 500, error, duration);
  });

  next();
};
