import mongoose, { Document, Schema } from 'mongoose';


export interface IMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  isFromAi: boolean;
  content: string;
  suggestedQuestions?: string[];
  token?: number;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
    isFromAi: { type: Boolean, required: true },
    content: { type: String, required: true },
    suggestedQuestions: { type: [String] },
    token: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>('Message', messageSchema);
