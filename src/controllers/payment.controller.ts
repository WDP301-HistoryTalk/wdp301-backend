import { Request, Response, NextFunction } from 'express';
import Tier from '../models/tier.model';
import { sendSuccess } from '../utils/response';

export class PaymentController {
  static async listTiers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tiers = await Tier.find({ isActive: true }).sort({ amount: 1 });
      
      const mappedTiers = tiers.map(t => {
        const obj = t.toObject();
        return {
          ...obj,
          id: (obj as any).id || (obj as any)._id,
        };
      });

      sendSuccess(res, mappedTiers, 'Tiers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
