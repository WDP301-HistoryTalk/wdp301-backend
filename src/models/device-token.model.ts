import mongoose, { Document, Schema } from 'mongoose';

export interface IDeviceToken extends Document {
  uid: mongoose.Types.ObjectId;
  fcmToken: string;
  platform: 'android' | 'ios';
  createdAt: Date;
  updatedAt: Date;
}

// fcmToken la khoa duy nhat (khong phai uid) — 1 may doi tai khoan thi
// upsert se tu chuyen token sang user moi thay vi de token cu tro nham chu.
const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fcmToken: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['android', 'ios'], required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDeviceToken>('DeviceToken', deviceTokenSchema);
