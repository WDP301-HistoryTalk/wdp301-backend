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
      sendSuccess(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserService.changePassword(req.user!.id, req.body);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  // --- Admin Methods ---

  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 10;
      const data = await UserService.listUsers(page, size);
      sendSuccess(res, data, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.findUserById(req.params.id);
      sendSuccess(res, { user }, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async adminUpdateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.adminUpdateUser(req.params.id, req.body);
      sendSuccess(res, { user }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.updateUserRole(req.params.id, req.body.role);
      sendSuccess(res, { user }, 'User role updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
