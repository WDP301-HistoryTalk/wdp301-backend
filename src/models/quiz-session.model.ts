import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizSession extends Document {
  quizId: mongoose.Types.ObjectId;
  uid: mongoose.Types.ObjectId;
  limitedTime: number;
  startTime: Date;
  endTime?: Date;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const quizSessionSchema = new Schema<IQuizSession>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    limitedTime: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    score: { type: Number },
    totalQuestions: { type: Number },
    percentage: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IQuizSession>('QuizSession', quizSessionSchema);
