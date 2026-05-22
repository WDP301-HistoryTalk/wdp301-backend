import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswerDetail extends Document {
  questionId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  selectedOption: number;
  isCorrect: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const answerDetailSchema = new Schema<IAnswerDetail>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'QuizSession', required: true, index: true },
    selectedOption: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { timestamps: true }
);

answerDetailSchema.index({ sessionId: 1, questionId: 1 });

export default mongoose.model<IAnswerDetail>('AnswerDetail', answerDetailSchema);
