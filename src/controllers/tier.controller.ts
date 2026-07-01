import { Request, Response, NextFunction } from 'express';
import { TierService } from '../services/tier.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/app-error';

export class TierController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tiers = await TierService.list();
      sendSuccess(res, tiers, 'Lấy danh sách gói thành công');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = await TierService.getById(req.params.id as string);
      if (!tier) throw new AppError('Không tìm thấy gói', 404);
      sendSuccess(res, tier, 'Lấy thông tin gói thành công');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = await TierService.create(req.body);
      sendSuccess(res, tier, 'Tạo gói thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = await TierService.update(req.params.id as string, req.body);
      if (!tier) throw new AppError('Không tìm thấy gói', 404);
      sendSuccess(res, tier, 'Cập nhật gói thành công');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const success = await TierService.delete(req.params.id as string);
      if (!success) throw new AppError('Không tìm thấy gói', 404);
      sendSuccess(res, null, 'Xóa gói thành công');
    } catch (error) {
      next(error);
    }
  }
}
