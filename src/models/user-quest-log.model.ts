import mongoose, { Document, Schema } from 'mongoose';

/**
 * Tiến độ nhiệm vụ hằng ngày của một user trong một ngày.
 * Mỗi (user, quest, ngày) là một document duy nhất — unique index bên dưới
 * vừa chống đếm trùng vừa là chốt idempotency cho việc nhận thưởng.
 * Định nghĩa quest (tên, mục tiêu, phần thưởng) nằm trong
 * services/gamification.service.ts — log chỉ lưu tiến độ.
 */
export interface IUserQuestLog extends Document {
  uid: mongoose.Types.ObjectId;
  questId: string;
  /** 'YYYY-MM-DD' theo giờ server */
  date: string;
  progress: number;
  claimedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userQuestLogSchema = new Schema<IUserQuestLog>(
  {
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questId: { type: String, required: true },
    date: { type: String, required: true },
    progress: { type: Number, default: 0 },
    claimedAt: { type: Date },
  },
  { timestamps: true }
);

userQuestLogSchema.index({ uid: 1, questId: 1, date: 1 }, { unique: true });

export default mongoose.model<IUserQuestLog>('UserQuestLog', userQuestLogSchema);
