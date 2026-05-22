import mongoose, { Document, Schema } from 'mongoose';
import { EntityType } from '../types/enums';

// Named IDocumentEntity to avoid clash with mongoose's Document type
export interface IDocumentEntity extends Document {
  uploadedBy: mongoose.Types.ObjectId;
  entityId: mongoose.Types.ObjectId;
  entityType: EntityType;
  title: string;
  fileUrl?: string;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocumentEntity>(
  {
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityType: { type: String, enum: Object.values(EntityType), required: true },
    title: { type: String, required: true },
    fileUrl: { type: String },
    content: { type: String },
  },
  { timestamps: true }
);

documentSchema.index({ entityId: 1, entityType: 1 });

export default mongoose.model<IDocumentEntity>('Document', documentSchema);
