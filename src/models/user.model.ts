import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/enums';

export interface IUser extends Document {
  userName: string;
  email: string;
  password?: string;
  role: UserRole;
  tierId?: mongoose.Types.ObjectId;
  token: number;
  lastActiveDate?: Date;
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
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.Customer,
    },
    tierId: { type: Schema.Types.ObjectId, ref: 'Tier' },
    token: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
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
