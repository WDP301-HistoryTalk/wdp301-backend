import mongoose, { Document, Schema } from 'mongoose';
import { EventEra } from '../types/enums';

export interface ICharacter extends Document {
  createdBy: mongoose.Types.ObjectId;
  name: string;
  title?: string;
  background?: string;
  imageUrl?: string;
  modelUrl?: string;
  videoUrl?: string;
  bornYear?: number;
  bornMonth?: number;
  bornDay?: number;
  isBornBc?: boolean;
  deathYear?: number;
  deathMonth?: number;
  deathDay?: number;
  isDeathBc?: boolean;
  era?: EventEra;
  personality?: string;
  isPublished: boolean;
  isActive: boolean;
  contextIds: mongoose.Types.ObjectId[]; // Linked historical contexts
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
    imageUrl: { type: String },
    modelUrl: { type: String },
    videoUrl: { type: String },
    bornYear: { type: Number },
    bornMonth: { type: Number, min: 1, max: 12 },
    bornDay: { type: Number, min: 1, max: 31 },
    isBornBc: { type: Boolean },
    deathYear: { type: Number },
    deathMonth: { type: Number, min: 1, max: 12 },
    deathDay: { type: Number, min: 1, max: 31 },
    isDeathBc: { type: Boolean },
    era: { type: String, enum: Object.values(EventEra) },
    personality: { type: String },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    contextIds: [{ type: Schema.Types.ObjectId, ref: 'HistoricalContext' }],
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

characterSchema.index({ name: 'text', title: 'text' });

export default mongoose.model<ICharacter>('Character', characterSchema);
