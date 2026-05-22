import mongoose, { Document, Schema } from 'mongoose';

export interface IChatSession extends Document {
  uid: mongoose.Types.ObjectId;
  contextId: mongoose.Types.ObjectId;
  characterId: mongoose.Types.ObjectId;
  title?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  deletedAt?: Date;
}

const chatSessionSchema = new Schema<IChatSession>(
  {
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contextId: { type: Schema.Types.ObjectId, ref: 'HistoricalContext', required: true },
    characterId: { type: Schema.Types.ObjectId, ref: 'Character', required: true },
    title: { type: String },
    lastMessageAt: { type: Date },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
