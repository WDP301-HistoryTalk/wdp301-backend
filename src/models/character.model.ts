import mongoose, { Document, Schema } from 'mongoose';
import { EventEra } from '../types/enums';

export interface ICharacter extends Document {
  characterId: string;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  title?: string;
  background?: string;
  imageUrl?: string;
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

const generateCharacterId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'char-';
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

const characterSchema = new Schema<ICharacter>(
  {
    characterId: { type: String, unique: true, default: generateCharacterId },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String },
    background: { type: String },
    imageUrl: { type: String },
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
characterSchema.index({ characterId: 1 });

export default mongoose.model<ICharacter>('Character', characterSchema);
