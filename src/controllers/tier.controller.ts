import { Request, Response, NextFunction } from 'express';
import { TierService } from '../services/tier.service';
import { sendSuccess } from '../utils/response';
import { ApiError } from '../middlewares/error';

export class TierController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tiers = await TierService.list();
      sendSuccess(res, tiers, 'Tiers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = await TierService.getById(req.params.id);
      if (!tier) throw new ApiError(404, 'Tier not found');
      sendSuccess(res, tier, 'Tier retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = await TierService.create(req.body);
      sendSuccess(res, tier, 'Tier created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = await TierService.update(req.params.id, req.body);
      if (!tier) throw new ApiError(404, 'Tier not found');
      sendSuccess(res, tier, 'Tier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const success = await TierService.delete(req.params.id);
      if (!success) throw new ApiError(404, 'Tier not found');
      sendSuccess(res, null, 'Tier deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
