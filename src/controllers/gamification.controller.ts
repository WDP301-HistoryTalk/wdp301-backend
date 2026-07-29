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

  // ── Staff: quản lý định nghĩa quest (chỉ Read + Update, không Create/Delete) ──

  static async staffListQuests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await GamificationService.listQuestsAdmin();
      sendSuccess(res, data, 'Lấy danh sách nhiệm vụ thành công');
    } catch (error) {
      next(error);
    }
  }

  static async staffGetQuest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await GamificationService.getQuestByIdAdmin(req.params.id as string);
      sendSuccess(res, data, 'Lấy thông tin nhiệm vụ thành công');
    } catch (error) {
      next(error);
    }
  }

  static async staffUpdateQuest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await GamificationService.updateQuest(req.params.id as string, req.body);
      sendSuccess(res, data, 'Cập nhật nhiệm vụ thành công');
    } catch (error) {
      next(error);
    }
  }
}
