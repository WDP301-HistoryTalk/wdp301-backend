import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/enums';

export interface IUser extends Document {
  userName: string;
  email: string;
  password?: string;
  fullName?: string;
  dob?: Date;
  gender?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  role: UserRole;
  tierId?: mongoose.Types.ObjectId;
  tierExpiresAt?: Date;
  token: number;
  lastActiveDate?: Date;
  lastTokenResetAt?: Date;
  /** Chuỗi ngày học liên tiếp (gamification). */
  streakCount: number;
  /** Ngày học gần nhất, dạng 'YYYY-MM-DD' theo giờ server. */
  lastStudyDate?: string;
  /** Chuỗi ngày học dài nhất từng đạt được. */
  longestStreak: number;
  /** Tổng số ngày có hoạt động học (mỗi ngày tính 1 lần). */
  totalStudyDays: number;
  isActive: boolean;
  googleId?: string;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    userName: { type: String, required: [true, 'Username is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, select: false },
    fullName: { type: String, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    phoneNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.Customer,
    },
    tierId: { type: Schema.Types.ObjectId, ref: 'Tier' },
    tierExpiresAt: { type: Date },
    token: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
    lastTokenResetAt: { type: Date },
    streakCount: { type: Number, default: 0 },
    lastStudyDate: { type: String },
    longestStreak: { type: Number, default: 0 },
    totalStudyDays: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    googleId: { type: String, select: false },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
