import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionReport extends Document {
  questionId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  uid: mongoose.Types.ObjectId;
  reason?: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

const questionReportSchema = new Schema<IQuestionReport>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  },
  { timestamps: true }
);

export default mongoose.model<IQuestionReport>('QuestionReport', questionReportSchema);
