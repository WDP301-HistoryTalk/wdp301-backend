import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/app-error';

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError('Invalid or expired token', 401));
  }
};
