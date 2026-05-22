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
  },
  { timestamps: true }
);

characterSchema.index({ name: 'text' });

export default mongoose.model<ICharacter>('Character', characterSchema);
