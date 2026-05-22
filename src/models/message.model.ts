import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  content: string;
  isFromAi: boolean;
  suggestedQuestion?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
    content: { type: String, required: true },
    isFromAi: { type: Boolean, required: true, default: false },
    suggestedQuestion: { type: [String] },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>('Message', messageSchema);
