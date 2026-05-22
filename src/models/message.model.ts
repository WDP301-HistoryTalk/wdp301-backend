import mongoose, { Document, Schema } from 'mongoose';
import { MessageRole } from '../types/enums';

export interface IMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  role: MessageRole;
  isFromAi: boolean;
  content: string;
  suggestedQuestion?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
    role: { type: String, enum: Object.values(MessageRole), required: true },
    isFromAi: { type: Boolean, required: true },
    content: { type: String, required: true },
    suggestedQuestion: { type: [String] },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>('Message', messageSchema);
