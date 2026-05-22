import mongoose, { Document, Schema } from 'mongoose';
import { EventEra } from '../types/enums';

export interface ICharacter extends Document {
  createdBy: mongoose.Types.ObjectId;
  name: string;
  title?: string;
  background?: string;
  image?: string;
  lifespan?: string;
  era?: EventEra;
  personality?: string;
  isPublished: boolean;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const characterSchema = new Schema<ICharacter>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String },
    background: { type: String },
    image: { type: String },
    lifespan: { type: String },
    era: { type: String, enum: Object.values(EventEra) },
    personality: { type: String },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

characterSchema.index({ name: 'text', title: 'text' });

export default mongoose.model<ICharacter>('Character', characterSchema);
