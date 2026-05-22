import mongoose, { Document, Schema } from 'mongoose';
import { EventEra } from '../types/enums';

export interface IHistoricalContext extends Document {
  createdBy: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  era: EventEra;
  year?: number;
  isDC: boolean;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
  characterIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const historicalContextSchema = new Schema<IHistoricalContext>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    era: { type: String, enum: Object.values(EventEra), required: true },
    year: { type: Number },
    isDC: { type: Boolean, default: false },
    location: { type: String },
    imageUrl: { type: String },
    videoUrl: { type: String },
    characterIds: [{ type: Schema.Types.ObjectId, ref: 'Character' }],
  },
  { timestamps: true }
);

historicalContextSchema.index({ era: 1 });
historicalContextSchema.index({ name: 'text' });

export default mongoose.model<IHistoricalContext>('HistoricalContext', historicalContextSchema);
