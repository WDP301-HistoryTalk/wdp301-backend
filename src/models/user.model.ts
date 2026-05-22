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
  googleId?: string;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
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
    googleId: { type: String, select: false },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
