import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: unknown = null,
  message = 'Success',
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};
