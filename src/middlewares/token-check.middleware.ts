import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import { AppError } from '../utils/app-error';

export const checkTokenBalance = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const user = await User.findById(req.user!.id).select('token');
  if (!user || user.token <= 0) {
    return next(
      new AppError('Không đủ token. Vui lòng nạp thêm để tiếp tục.', 403)
    );
  }
  next();
};
