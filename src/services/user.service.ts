import User from '../models/user.model';
import ChatSession from '../models/chat-session.model';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import QuizSession from '../models/quiz-session.model';
import { AppError } from '../utils/app-error';
import { UserRole, TierTitle, OrderStatus } from '../types/enums';
import Order from '../models/order.model';
import Tier from '../models/tier.model';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Message from '../models/message.model';
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
      let totalTokensToAdd = 0;

      // 1. Add free tier tokens
      const freeTier = await Tier.findOne({ title: TierTitle.Free, isActive: true });
      if (freeTier && freeTier.limitedToken != null) {
        totalTokensToAdd += freeTier.limitedToken;
      }

      // 2. Add all active paid tiers from orders
      const orders = await Order.find({ uid: user._id, status: OrderStatus.Paid }).populate('tierId');
      for (const order of orders) {
        const tier: any = order.tierId;
        if (tier && order.paidAt && tier.limitedToken != null) {
          const expiresAt = new Date(order.paidAt);
          expiresAt.setMonth(expiresAt.getMonth() + tier.noMonth);
          if (expiresAt.getTime() > today.getTime()) {
            totalTokensToAdd += tier.limitedToken;
          }
        }
      }

      if (totalTokensToAdd > 0) {
        user.token = (user.token || 0) + totalTokensToAdd;
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

  static async getMyDashboard(userId: string) {
    const uid = new mongoose.Types.ObjectId(userId);

    // 1. Learning Analytics (Quiz)
    const quizSessions = await QuizSession.find({ uid, endTime: { $exists: true } }).populate('quizId');
    const totalQuizzesAttempted = quizSessions.length;
    
    let totalScorePercentage = 0;
    const eraCounts: Record<string, number> = {};
    const recentQuizzes = quizSessions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(s => ({
        sessionId: s._id,
        quizTitle: (s.quizId as any)?.title || 'Unknown',
        percentage: s.percentage,
        completedAt: s.endTime,
      }));

    for (const s of quizSessions) {
      totalScorePercentage += s.percentage || 0;
      const era = (s.quizId as any)?.era;
      if (era) {
        eraCounts[era] = (eraCounts[era] || 0) + 1;
      }
    }

    const averageQuizScore = totalQuizzesAttempted > 0 ? Math.round(totalScorePercentage / totalQuizzesAttempted) : 0;

    // 2. AI Usage & Token Analytics
    const user = await User.findById(uid).populate('tierId');
    
    const chatSessions = await ChatSession.find({ uid }).select('_id characterId');
    const sessionIds = chatSessions.map(s => s._id);

    const tokenConsumption = await Message.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$token' },
          promptTokens: { $sum: { $cond: [{ $eq: ['$isFromAi', false] }, '$token', 0] } },
          completionTokens: { $sum: { $cond: [{ $eq: ['$isFromAi', true] }, '$token', 0] } }
        }
      }
    ]);

    // Top Characters
    const topCharactersAggr = await Message.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $lookup: {
          from: 'chatsessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      { $unwind: '$session' },
      {
        $group: {
          _id: '$session.characterId',
          messageCount: { $sum: 1 },
          tokenUsed: { $sum: '$token' }
        }
      },
      { $sort: { messageCount: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'characters',
          localField: '_id',
          foreignField: '_id',
          as: 'character'
        }
      },
      { $unwind: { path: '$character', preserveNullAndEmptyArrays: true } }
    ]);

    const topCharacters = topCharactersAggr.map(c => ({
      characterId: c._id,
      name: c.character?.name || 'Unknown Character',
      messageCount: c.messageCount,
      tokenUsed: c.tokenUsed
    }));

    return {
      learning: {
        totalQuizzesAttempted,
        averageScorePercentage: averageQuizScore,
        eraDistribution: eraCounts,
        recentQuizzes
      },
      aiUsage: {
        currentBalance: user?.token || 0,
        tier: (user?.tierId as any)?.title || 'free',
        totalTokensUsed: tokenConsumption[0]?.totalTokens || 0,
        promptTokens: tokenConsumption[0]?.promptTokens || 0,
        completionTokens: tokenConsumption[0]?.completionTokens || 0,
        topCharacters
      }
    };
  }

  static async uploadAvatarDirect(
    userId: string,
    file: Express.Multer.File,
    currentUserId: string,
    userRole?: string
  ): Promise<{ url: string; expiresIn: number }> {
    if (userId !== currentUserId && userRole !== 'ADMIN' && userRole !== 'SYSTEM_ADMIN') {
      throw new AppError('Bạn chỉ có thể thay đổi avatar của chính mình', 403);
    }
    if (!file || !file.buffer) throw new AppError('File ảnh avatar không được để trống', 400);

    const user = await User.findById(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    const ext = file.originalname.split('.').pop() || 'jpg';
    const storagePath = `avatars/${userId}/avatar.${ext}`;

    const { supabaseStorageService } = await import('./supabase.service');
    const uploadedPath = await supabaseStorageService.uploadFile(storagePath, file.buffer, file.mimetype || 'image/jpeg');

    user.avatarUrl = uploadedPath;
    await user.save();

    return await supabaseStorageService.createSignedUrl(uploadedPath, 3600);
  }

  static async generateAvatarViewUrl(userId: string): Promise<{ url: string; expiresIn: number }> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    if (!user.avatarUrl) throw new AppError('Người dùng chưa có avatar', 400);

    if (user.avatarUrl.startsWith('http://') || user.avatarUrl.startsWith('https://')) {
      return { url: user.avatarUrl, expiresIn: 3600 };
    }

    const { supabaseStorageService } = await import('./supabase.service');
    return await supabaseStorageService.createSignedUrl(user.avatarUrl, 3600);
  }

  static async deleteAvatar(userId: string, currentUserId: string, userRole?: string): Promise<void> {
    if (userId !== currentUserId && userRole !== 'ADMIN' && userRole !== 'SYSTEM_ADMIN') {
      throw new AppError('Bạn chỉ có quyền xóa avatar của chính mình', 403);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    if (user.avatarUrl && !user.avatarUrl.startsWith('http')) {
      const { supabaseStorageService } = await import('./supabase.service');
      await supabaseStorageService.deleteFile(user.avatarUrl);
    }

    user.avatarUrl = undefined;
    await user.save();
  }
}

