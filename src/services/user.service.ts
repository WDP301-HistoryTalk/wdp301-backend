import User from '../models/user.model';
import ChatSession from '../models/chat-session.model';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import QuizSession from '../models/quiz-session.model';
import { AppError } from '../utils/app-error';
import { UserRole } from '../types/enums';
import bcrypt from 'bcryptjs';

export class UserService {


  static async findUserById(id: string) {
    const user = await User.findById(id).populate('tierId');
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    // Daily Token Reset Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReset = user.lastTokenResetAt ? new Date(user.lastTokenResetAt) : null;
    if (lastReset) lastReset.setHours(0, 0, 0, 0);

    if (!lastReset || lastReset.getTime() !== today.getTime()) {
      const tier: any = user.tierId;
      if (tier && tier.limitedToken != null) {
        user.token = (user.token || 0) + tier.limitedToken;
      }
      user.lastTokenResetAt = new Date();
      await user.save();
    }

    return user;
  }

  static async updateProfile(id: string, data: any) {
    const allowedFields = ['userName', 'fullName', 'dob', 'gender', 'phoneNumber', 'address', 'avatarUrl'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const user = await User.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true }).populate('tierId');
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    return user;
  }

  static async changePassword(id: string, data: any) {
    const { currentPassword, newPassword, confirmPassword } = data;
    if (newPassword !== confirmPassword) {
      throw new AppError('Mật khẩu mới và mật khẩu xác nhận không khớp', 400);
    }

    const user = await User.findById(id).select('+password');
    if (!user || !user.password) throw new AppError('Không tìm thấy người dùng', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('Mật khẩu hiện tại không chính xác', 400);

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }

  // --- Admin Methods ---

  static async listUsers(page: number = 0, size: number = 10) {
    const skip = page * size;
    const users = await User.find().skip(skip).limit(size).populate('tierId');
    const total = await User.countDocuments();
    const content = users;
    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      currentPage: page,
      pageSize: size,
      hasNext: skip + size < total,
      hasPrevious: page > 0,
    };
  }

  static async adminUpdateUser(id: string, data: any) {
    const allowedFields = ['userName', 'fullName', 'dob', 'gender', 'phoneNumber', 'address', 'avatarUrl', 'tierId'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    const user = await User.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true }).populate('tierId');
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    return user;
  }

  static async updateUserRole(id: string, role: string) {
    const user = await User.findByIdAndUpdate(id, { role }, { returnDocument: 'after', runValidators: true }).populate('tierId');
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    return user;
  }

  /**
   * Soft-delete (deactivate) a user account.
   * Only SYSTEM_ADMIN can deactivate another user's account.
   * Cascades soft-delete to all content owned by the target user.
   * Mirrors Java: AuthServiceImpl.softDeleteUser + cascadeSoftDeleteContent
   */
  static async deactivateUser(targetUserId: string, requestingUserId: string) {
    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) throw new AppError('Requesting user not found', 404);

    // Only SYSTEM_ADMIN may deactivate someone else
    if (targetUserId !== requestingUserId && requestingUser.role !== UserRole.SystemAdmin) {
      throw new AppError('Chỉ SYSTEM_ADMIN mới có thể vô hiệu hóa tài khoản của người dùng khác.', 403);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new AppError('Target user not found', 404);

    const now = new Date();

    // Mark user as deactivated
    targetUser.deletedAt = now;
    targetUser.isActive = false;
    await targetUser.save();

    // Cascade soft-delete all user content (mirrors Java cascadeSoftDeleteContent)
    await Promise.all([
      // Chat sessions
      ChatSession.updateMany(
        { uid: targetUserId, deletedAt: { $exists: false } },
        { deletedAt: now }
      ),
      // Characters created by user
      Character.updateMany(
        { createdBy: targetUserId, deletedAt: { $exists: false } },
        { deletedAt: now, isActive: false }
      ),
      // Historical contexts created by user
      HistoricalContext.updateMany(
        { createdBy: targetUserId, deletedAt: { $exists: false } },
        { deletedAt: now, isActive: false }
      ),
      // Quiz sessions
      QuizSession.updateMany(
        { uid: targetUserId, deletedAt: { $exists: false } },
        { deletedAt: now }
      ),
    ]);
  }

  /**
   * Restore a single soft-deleted user.
   * Mirrors Java: UserServiceImpl.restoreUser
   * PATCH /users/:id/restore
   */
  static async restoreUser(targetUserId: string) {
    const user = await User.findById(targetUserId).populate('tierId');
    if (!user) throw new AppError('User not found', 404);
    if (!user.deletedAt) throw new AppError('User account is already active', 400);

    user.deletedAt = undefined;
    user.isActive = true;
    await user.save();
    return user;
  }

  /**
   * Restore multiple soft-deleted users by ID list.
   * Mirrors Java: UserServiceImpl.restoreUsersBatch
   * PATCH /users/restore/batch
   */
  static async restoreUsersBatch(userIds: string[]) {
    const users = await User.find({ _id: { $in: userIds } }).populate('tierId');
    const restoredIds: string[] = [];

    for (const user of users) {
      if (user.deletedAt) {
        user.deletedAt = undefined;
        user.isActive = true;
        await user.save();
        restoredIds.push(user._id.toString());
      }
    }

    const failedIds = userIds.filter(id => !restoredIds.includes(id));
    return {
      restoredCount: restoredIds.length,
      restoredUserIds: restoredIds,
      failedUserIds: failedIds,
    };
  }

  /**
   * Restore ALL soft-deleted users in the system.
   * Mirrors Java: UserServiceImpl.restoreAllUsers (JPQL: UPDATE User SET deletedAt = null)
   * PATCH /users/restore/all
   */
  static async restoreAllUsers() {
    const result = await User.updateMany(
      { deletedAt: { $ne: null, $exists: true } },
      { $unset: { deletedAt: '' }, $set: { isActive: true } }
    );
    return result.modifiedCount;
  }
}
