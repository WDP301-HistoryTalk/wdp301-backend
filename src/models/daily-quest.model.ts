import mongoose, { Document, Schema } from 'mongoose';

/**
 * Định nghĩa một nhiệm vụ hằng ngày (bảng cấu hình).
 * Tiến độ của từng user nằm ở UserQuestLog (tham chiếu qua questId).
 * Sửa thưởng/tên/mục tiêu ở đây có hiệu lực ngay, không cần deploy code.
 */
export type DailyQuestType = 'CHAT' | 'QUIZ' | 'READ_CONTEXT';

export interface IDailyQuest extends Document {
  /** Mã cố định dùng làm khoá liên kết với UserQuestLog (vd 'chat_once'). */
  questId: string;
  /** Loại hành động được đếm — hook trong chat/quiz/context bắn theo type. */
  type: DailyQuestType;
  title: string;
  /** Số lần cần thực hiện trong ngày để hoàn thành. */
  target: number;
  /** Token thưởng khi nhận. */
  rewardTokens: number;
  /** Thứ tự hiển thị trên app. */
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dailyQuestSchema = new Schema<IDailyQuest>(
  {
    questId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['CHAT', 'QUIZ', 'READ_CONTEXT'],
      required: true,
    },
    title: { type: String, required: true },
    target: { type: Number, required: true, min: 1, default: 1 },
    rewardTokens: { type: Number, required: true, min: 0 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDailyQuest>('DailyQuest', dailyQuestSchema);
