import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizRating extends Document {
  quizId: mongoose.Types.ObjectId;
  uid: mongoose.Types.ObjectId;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const quizRatingSchema = new Schema<IQuizRating>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    value: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Moi user chi co dung 1 rating cho 1 quiz — danh gia lai se upsert de.
quizRatingSchema.index({ quizId: 1, uid: 1 }, { unique: true });

export default mongoose.model<IQuizRating>('QuizRating', quizRatingSchema);
