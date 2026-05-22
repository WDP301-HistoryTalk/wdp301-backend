import mongoose, { Document, Schema } from 'mongoose';
import { TransactionStatus } from '../types/enums';

export interface ITransaction extends Document {
  orderId: mongoose.Types.ObjectId;
  amount: number;
  paymentLinkId?: string;
  payload?: Record<string, unknown>;
  status: TransactionStatus;
  transactionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    amount: { type: Number, required: true },
    paymentLinkId: { type: String },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.Pending,
    },
    transactionDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
