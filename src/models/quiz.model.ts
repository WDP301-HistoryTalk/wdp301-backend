import mongoose, { Document, Schema } from 'mongoose';
import { EventEra } from '../types/enums';

export interface IQuiz extends Document {
  contextId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  era: EventEra;
  playCount: number;
  rating: number;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    contextId: {
      type: Schema.Types.ObjectId,
      ref: 'HistoricalContext',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    era: { type: String, enum: Object.values(EventEra), required: true },
    playCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', quizSchema);
