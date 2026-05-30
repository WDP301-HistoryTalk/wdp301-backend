import mongoose, { Document, Schema } from 'mongoose';
import { TierTitle } from '../types/enums';

export interface ITier extends Document {
  title: TierTitle;
  amount: number;
  noMonth: number;
  limitedToken: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tierSchema = new Schema<ITier>(
  {
    title: {
      type: String,
      enum: Object.values(TierTitle),
      required: true,
      unique: true,
    },
    amount: { type: Number, required: true, min: 0 },
    noMonth: { type: Number, required: true, min: 1 },
    limitedToken: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITier>('Tier', tierSchema);
