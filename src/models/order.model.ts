import mongoose, { Document, Schema } from 'mongoose';
import { OrderStatus } from '../types/enums';

export interface IOrder extends Document {
  uid: mongoose.Types.ObjectId;
  tierId: mongoose.Types.ObjectId;
  orderCode: number;
  amount: number;
  paymentLinkId?: string;
  checkoutUrl?: string;
  qrCode?: string;
  status: OrderStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    uid: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tierId: { type: Schema.Types.ObjectId, ref: 'Tier', required: true },
    orderCode: { type: Number, required: true, unique: true },
    amount: { type: Number, required: true },
    paymentLinkId: { type: String },
    checkoutUrl: { type: String },
    qrCode: { type: String },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Pending,
    },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', orderSchema);
