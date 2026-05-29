import User from '../models/user.model';
import { AppError } from '../utils/app-error';
import bcrypt from 'bcryptjs';

export class UserService {
  static async findUserById(id: string) {
    const user = await User.findById(id).populate('tierId');
    if (!user) throw new AppError('User not found', 404);

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
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  static async changePassword(id: string, data: any) {
    const { currentPassword, newPassword, confirmPassword } = data;
    if (newPassword !== confirmPassword) {
      throw new AppError('New password and confirmation password do not match', 400);
    }

    const user = await User.findById(id).select('+password');
    if (!user || !user.password) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }

  // --- Admin Methods ---

  static async listUsers(page: number = 0, size: number = 10) {
    const skip = page * size;
    const users = await User.find().skip(skip).limit(size).populate('tierId');
    const total = await User.countDocuments();
    return {
      content: users,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      currentPage: page,
      pageSize: size,
      hasNext: skip + size < total,
      hasPrevious: page > 0,
    };
  }

  static async adminUpdateUser(id: string, data: any) {
    const allowedFields = ['userName', 'fullName', 'dob', 'gender', 'phoneNumber', 'address', 'avatarUrl'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    const user = await User.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  static async updateUserRole(id: string, role: string) {
    const user = await User.findByIdAndUpdate(id, { role }, { returnDocument: 'after', runValidators: true });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}
