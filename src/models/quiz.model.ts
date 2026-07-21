import mongoose, { Document, Schema } from 'mongoose';
import { EventEra, QuizLevel } from '../types/enums';

export interface IQuiz extends Document {
  contextId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  level: QuizLevel;
  grade?: number;
  chapterNumber?: number;
  chapterTitle?: string;
  durationSeconds?: number;
  era: EventEra;
  playCount: number;
  rating: number;
  ratingCount: number;
  isActive: boolean;
  isPublished: boolean;
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
    description: { type: String },
    level: {
      type: String,
      enum: Object.values(QuizLevel),
      required: true,
      default: QuizLevel.Medium,
    },
    grade: { type: Number },
    chapterNumber: { type: Number },
    chapterTitle: { type: String },
    durationSeconds: { type: Number, default: 0 },
    era: { type: String, enum: Object.values(EventEra), required: true },
    playCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', quizSchema);
