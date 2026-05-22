import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion extends Document {
  quizId: mongoose.Types.ObjectId;
  content: string;
  options: string[];
  correctAnswer: number;
  orderIndex: number;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    content: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true },
    orderIndex: { type: Number, required: true, default: 0 },
    explanation: { type: String },
  },
  { timestamps: true }
);

questionSchema.index({ quizId: 1, orderIndex: 1 });

export default mongoose.model<IQuestion>('Question', questionSchema);
