import { Request, Response, NextFunction } from 'express';
import Tier from '../models/tier.model';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/app-error';

export class TierController {
  static async listTiers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const showAll = req.query.all === 'true';
      const filter = showAll ? {} : { isActive: true };

      const tiers = await Tier.find(filter).sort({ amount: 1 });
      const mappedTiers = tiers.map(t => {
        const obj = t.toObject();
        const tierId = (obj as any).id || (obj as any)._id;
        return {
          tierId,
          title: obj.title,
          amount: obj.amount,
          noMonth: obj.noMonth,
          limitedToken: obj.limitedToken,
          isActive: obj.isActive,
        };
      });

      sendSuccess(res, mappedTiers, 'Tiers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTierById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const tier = await Tier.findById(id);
      if (!tier) {
        throw new AppError('Không tìm thấy gói dịch vụ', 404);
      }
      const tierObj = tier.toObject();
      const mapped = {
        tierId: (tierObj as any).id || tierObj._id,
        title: tierObj.title,
        amount: tierObj.amount,
        noMonth: tierObj.noMonth,
        limitedToken: tierObj.limitedToken,
        isActive: tierObj.isActive,
      };
      sendSuccess(res, mapped, 'Tier retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, amount, noMonth, limitedToken, isActive } = req.body;
      const tier = await Tier.create({ title, amount, noMonth, limitedToken, isActive });
      const tierObj = tier.toObject();
      const mapped = {
        tierId: (tierObj as any).id || tierObj._id,
        title: tierObj.title,
        amount: tierObj.amount,
        noMonth: tierObj.noMonth,
        limitedToken: tierObj.limitedToken,
        isActive: tierObj.isActive,
      };
      sendSuccess(res, mapped, 'Tier created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const tier = await Tier.findByIdAndUpdate(id, req.body, { returnDocument: 'after', runValidators: true });
      if (!tier) {
        throw new AppError('Không tìm thấy gói dịch vụ', 404);
      }
      const tierObj = tier.toObject();
      const mapped = {
        tierId: (tierObj as any).id || tierObj._id,
        title: tierObj.title,
        amount: tierObj.amount,
        noMonth: tierObj.noMonth,
        limitedToken: tierObj.limitedToken,
        isActive: tierObj.isActive,
      };
      sendSuccess(res, mapped, 'Tier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const tier = await Tier.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
      if (!tier) {
        throw new AppError('Không tìm thấy gói dịch vụ', 404);
      }
      sendSuccess(res, null, 'Tier deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}
