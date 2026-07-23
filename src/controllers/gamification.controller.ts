import { Request, Response, NextFunction } from 'express';
import { GamificationService } from '../services/gamification.service';
import { sendSuccess } from '../utils/response';

export class GamificationController {
  static async getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await GamificationService.getToday(req.user!.id);
      sendSuccess(res, data, 'Daily quests retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async claim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { questId } = req.body;
      const data = await GamificationService.claim(req.user!.id, questId);
      sendSuccess(res, data, 'Quest reward claimed successfully');
    } catch (error) {
      next(error);
    }
  }
}
