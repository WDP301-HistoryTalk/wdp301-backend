import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums';
import { AppError } from '../utils/app-error';

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
