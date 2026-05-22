import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/enums';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  tierId?: mongoose.Types.ObjectId;
  token: number;
  lastActiveDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.Customer,
    },
    tierId: {
      type: Schema.Types.ObjectId,
      ref: 'Tier',
    },
    token: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
