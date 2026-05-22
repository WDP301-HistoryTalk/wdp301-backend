import mongoose, { Document, Schema } from 'mongoose';

export interface ICharacter extends Document {
  createdBy: mongoose.Types.ObjectId;
  name: string;
  title?: string;
  background?: string;
  imageUrl?: string;
  bornDate?: Date;
  deathDate?: Date;
  personality?: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  isActive: boolean;
  deletedAt?: Date;
}

const characterSchema = new Schema<ICharacter>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String },
    background: { type: String },
    imageUrl: { type: String },
    bornDate: { type: Date },
    deathDate: { type: Date },
    personality: { type: String },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

characterSchema.index({ name: 'text' });

export default mongoose.model<ICharacter>('Character', characterSchema);
