import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapToUserProfile = async (user: any) => {
  const tierObj = user.tierId;

  // avatarUrl is either a legacy pasted http(s) link or a private Supabase
  // storage path from the avatar upload-direct endpoint — resolve the
  // latter into a signed URL so it's directly renderable as an <img> src.
  const { supabaseStorageService } = await import('../services/supabase.service');
  const resolvedAvatarUrl = await supabaseStorageService.resolveViewUrl(user.avatarUrl);

  return {
    uid: user._id.toString(),
    userName: user.userName,
    email: user.email,
    role: user.role.toUpperCase(),
    fullName: user.fullName || null,
    dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
    gender: user.gender || null,
    phoneNumber: user.phoneNumber || null,
    address: user.address || null,
    avatarUrl: resolvedAvatarUrl || null,
    tierId: tierObj ? tierObj._id?.toString() : null,
    tierTitle: tierObj ? tierObj.title : null,
    subscriptionEndTime: user.tierExpiresAt ? user.tierExpiresAt.toISOString() : null,
    token: user.token || 0,
    lastActiveDate: user.lastActiveDate ? user.lastActiveDate.toISOString() : null,
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null
  };
};

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.findUserById(req.user!.id);
      sendSuccess(res, await mapToUserProfile(user), 'User profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UserService.getMyDashboard(req.user!.id);
      sendSuccess(res, data, 'User dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, await mapToUserProfile(user), 'User profile updated successfully');
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
      const data: any = await UserService.listUsers(page, size);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.content = await Promise.all(data.content.map((u: any) => mapToUserProfile(u)));
      sendSuccess(res, data, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.findUserById(req.params.id as string);
      sendSuccess(res, await mapToUserProfile(user), 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async adminUpdateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.adminUpdateUser(req.params.id as string, req.body);
      sendSuccess(res, await mapToUserProfile(user), 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.updateUserRole(req.params.id as string, req.body.role);
      sendSuccess(res, await mapToUserProfile(user), 'User role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/:id/deactivate
   * Soft-delete (deactivate) a user + cascade-delete all their content.
   * SYSTEM_ADMIN only (enforced by route middleware + service layer).
   * Response: { success: true, data: null, message: 'User account deactivated successfully' }
   * Mirrors: Java AdminUserController.deactivateUser
   */
  static async deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.id as string;
      const requestingUserId = req.user!.id;
      await UserService.deactivateUser(targetUserId, requestingUserId);
      sendSuccess(res, null, 'User account deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/:id/restore
   * Restore a single soft-deleted user account (SYSTEM_ADMIN only).
   * Mirrors: Java AdminUserController.restoreUser
   */
  static async restoreUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.restoreUser(req.params.id as string);
      sendSuccess(res, await mapToUserProfile(user), 'User account restored successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/restore/batch
   * Restore multiple soft-deleted user accounts in batch (SYSTEM_ADMIN only).
   * Body: { userIds: string[] }
   * Mirrors: Java AdminUserController.restoreUsersBatch
   */
  static async restoreUsersBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds } = req.body as { userIds: string[] };
      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
        return;
      }
      const result = await UserService.restoreUsersBatch(userIds);
      sendSuccess(res, result, 'Batch user restoration completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/restore/all
   * Restore ALL soft-deleted user accounts (SYSTEM_ADMIN only).
   * Mirrors: Java AdminUserController.restoreAllUsers
   */
  static async restoreAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await UserService.restoreAllUsers();
      sendSuccess(res, count, `All deactivated users restored successfully (${count} users restored)`);
    } catch (error) {
      next(error);
    }
  }

  static async uploadAvatarDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawUserId = req.params.userId;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const file = req.file;

      let userId = typeof rawUserId === 'string' ? rawUserId : Array.isArray(rawUserId) ? rawUserId[0] : '';
      if (!userId || userId === 'undefined' || userId === 'null' || userId === 'me') {
        userId = currentUserId || '';
      }

      if (!file) {
        res.status(400).json({ success: false, message: 'Yêu cầu đính kèm file ảnh avatar' });
        return;
      }

      const response = await UserService.uploadAvatarDirect(userId, file, currentUserId || '', userRole);
      sendSuccess(res, response, 'Avatar uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async generateAvatarViewUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawUserId = req.params.userId;
      const currentUserId = req.user?.id;
      let userId = typeof rawUserId === 'string' ? rawUserId : Array.isArray(rawUserId) ? rawUserId[0] : '';
      if (!userId || userId === 'undefined' || userId === 'null' || userId === 'me') {
        userId = currentUserId || '';
      }
      const response = await UserService.generateAvatarViewUrl(userId, currentUserId);
      sendSuccess(res, response, 'Avatar view URL generated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawUserId = req.params.userId;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      let userId = typeof rawUserId === 'string' ? rawUserId : Array.isArray(rawUserId) ? rawUserId[0] : '';
      if (!userId || userId === 'undefined' || userId === 'null' || userId === 'me') {
        userId = currentUserId || '';
      }

      await UserService.deleteAvatar(userId, currentUserId || '', userRole);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}



