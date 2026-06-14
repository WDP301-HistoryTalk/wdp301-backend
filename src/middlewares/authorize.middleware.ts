import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums';
import { AppError } from '../utils/app-error';

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Chưa xác thực', 401));
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new AppError('Bạn không có quyền thực hiện hành động này', 403));
    }
    next();
  };
};
