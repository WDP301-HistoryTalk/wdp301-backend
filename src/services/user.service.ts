import User from '../models/user.model';
import { AppError } from '../utils/app-error';

export class UserService {
  static async findUserById(id: string) {
    const user = await User.findById(id).populate('tierId');
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  static async updateProfile(id: string, data: { userName?: string }) {
    const user = await User.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}
