import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.findUserById(req.user!.id);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, { user }, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }
}
