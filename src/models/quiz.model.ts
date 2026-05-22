import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  _id: mongoose.Types.ObjectId;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface IQuiz extends Document {
  contextId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  content: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
  explanation: { type: String },
});

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
    questions: [questionSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', quizSchema);
