import mongoose, { Document, Schema } from 'mongoose';
import { EventEra, EventCategory } from '../types/enums';

export interface IHistoricalContext extends Document {
  createdBy: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  era: EventEra;
  category?: EventCategory;
  year?: number;
  startYear?: number;
  endYear?: number;
  isBC: boolean;
  period?: string;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
  characterIds: mongoose.Types.ObjectId[];
  isPublished: boolean;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}



const historicalContextSchema = new Schema<IHistoricalContext>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    era: { type: String, enum: Object.values(EventEra), required: true },
    category: { type: String, enum: Object.values(EventCategory) },
    year: { type: Number },
    startYear: { type: Number },
    endYear: { type: Number },
    isBC: { type: Boolean, default: false },
    period: { type: String },
    location: { type: String },
    imageUrl: { type: String },
    videoUrl: { type: String },
    characterIds: [{ type: Schema.Types.ObjectId, ref: 'Character' }],
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

historicalContextSchema.index({ era: 1 });
historicalContextSchema.index({ name: 'text' });

// Virtual field for yearLabel
historicalContextSchema.virtual('yearLabel').get(function() {
  if (this.year) {
    return `${this.year} SCN`;
  }
  return undefined;
});

export default mongoose.model<IHistoricalContext>('HistoricalContext', historicalContextSchema);
