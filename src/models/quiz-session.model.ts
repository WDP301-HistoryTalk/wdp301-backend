import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswerDetail {
  questionId: mongoose.Types.ObjectId;
  selectedOption: number;
  isCorrect: boolean;
}

export interface IQuizSession extends Document {
  quizId: mongoose.Types.ObjectId;
  uid: mongoose.Types.ObjectId;
  limitedTime: number;
  startTime: Date;
  endTime?: Date;
  score?: number;
  answers: IAnswerDetail[];
  createdAt: Date;
  updatedAt: Date;
}

const answerDetailSchema = new Schema<IAnswerDetail>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedOption: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

const quizSessionSchema = new Schema<IQuizSession>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    limitedTime: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    score: { type: Number },
    answers: [answerDetailSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IQuizSession>('QuizSession', quizSessionSchema);
