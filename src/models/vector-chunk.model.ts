import mongoose, { Document, Schema } from 'mongoose';

export interface IVectorChunk extends Document {
  docId: mongoose.Types.ObjectId;
  entityId: mongoose.Types.ObjectId;
  content: string;
  embedding: number[];
  sequenceNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const vectorChunkSchema = new Schema<IVectorChunk>(
  {
    docId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    content: { type: String, required: true },
    // Atlas Vector Search index must be created separately via Atlas UI or Admin API
    embedding: { type: [Number], required: true },
    sequenceNumber: { type: Number, required: true },
  },
  { timestamps: true }
);

vectorChunkSchema.index({ docId: 1, sequenceNumber: 1 });

export default mongoose.model<IVectorChunk>('VectorChunk', vectorChunkSchema);
