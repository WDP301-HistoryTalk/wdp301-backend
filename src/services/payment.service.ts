import mongoose from 'mongoose';
import Order, { IOrder } from '../models/order.model';
import Transaction from '../models/transaction.model';
import Tier from '../models/tier.model';
import User from '../models/user.model';
import { AppError } from '../utils/app-error';
import { config } from '../config';
import { OrderStatus, TransactionStatus } from '../types/enums';
import { payos, WebhookData } from './payos.client';

async function generateOrderCode(): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const exists = await Order.exists({ orderCode: code });
    if (!exists) return code;
  }
  throw new AppError('Không thể tạo mã đơn hàng', 500);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export class PaymentService {
  static async createPayOSCheckout(userId: string, tierId: string): Promise<Record<string, unknown>> {
    const tier = await Tier.findOne({ _id: tierId, isActive: true });
    if (!tier) throw new AppError('Tier not found or inactive', 404);
    if (tier.amount <= 0) throw new AppError('Free tier requires no payment', 400);

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const orderCode = await generateOrderCode();
    const order = await Order.create({
      uid: new mongoose.Types.ObjectId(userId),
      tierId: tier._id,
      orderCode,
      amount: tier.amount,
      status: OrderStatus.Pending,
    });

    const description = ('Goi ' + tier.title).slice(0, 25);
    try {
      const link = await payos.createPaymentLink({
        orderCode,
        amount: tier.amount,
        description,
        returnUrl: config.payos.returnUrl + '?orderCode=' + orderCode,
        cancelUrl: config.payos.cancelUrl + '?orderCode=' + orderCode + '&cancel=true',
        buyerName: user.fullName || user.userName,
        buyerEmail: user.email,
        items: [{ name: 'Tier ' + tier.title, quantity: 1, price: tier.amount }],
      });

      order.paymentLinkId = link.paymentLinkId;
      order.checkoutUrl = link.checkoutUrl;
      order.qrCode = link.qrCode;
      await order.save();

      return {
        orderId: order._id.toString(),
        orderCode,
        paymentLinkId: link.paymentLinkId,
        checkoutUrl: link.checkoutUrl,
        qrCode: link.qrCode,
        amount: tier.amount,
        status: order.status.toUpperCase(),
        expiredAt: order.createdAt // Mock expiration
      };
    } catch (err) {
      order.status = OrderStatus.Cancelled;
      await order.save();
      throw err;
    }
  }

  static async getMyPaymentHistory(userId: string): Promise<Record<string, unknown>[]> {
    const orders = await Order.find({ uid: userId })
      .populate('tierId', 'title amount noMonth')
      .sort({ createdAt: -1 });

    return orders.map(o => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tierObj = o.tierId as any;
      return {
        orderId: o._id.toString(),
        orderCode: o.orderCode,
        tierId: tierObj ? tierObj._id.toString() : null,
        tierTitle: tierObj ? tierObj.title : null,
        amount: o.amount,
        status: o.status.toUpperCase(),
        paymentLinkId: o.paymentLinkId,
        createdAt: o.createdAt?.toISOString(),
        paidAt: o.paidAt?.toISOString(),
        expiredAt: null
      };
    });
  }

  static async getAllPaymentHistory(status?: string, userId?: string, page = 0, size = 20): Promise<Record<string, unknown>> {
    const query: Record<string, unknown> = {};
    if (status) query.status = status.toLowerCase();
    if (userId) query.uid = userId;

    const skip = page * size;
    const [orders, total] = await Promise.all([
      Order.find(query).populate('tierId').populate('uid').sort({ createdAt: -1 }).skip(skip).limit(size),
      Order.countDocuments(query)
    ]);

    return {
      content: orders.map(o => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tierObj = o.tierId as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userObj = o.uid as any;
        return {
          orderId: o._id.toString(),
          orderCode: o.orderCode,
          tierId: tierObj ? tierObj._id.toString() : null,
          tierTitle: tierObj ? tierObj.title : null,
          amount: o.amount,
          status: o.status.toUpperCase(),
          fulfillmentStatus: 'FULFILLED',
          fulfilledAt: o.paidAt?.toISOString(),
          fulfillmentAttempts: 1,
          fulfillmentError: null,
          paymentLinkId: o.paymentLinkId,
          createdAt: o.createdAt?.toISOString(),
          paidAt: o.paidAt?.toISOString(),
          expiredAt: null,
          userId: userObj ? userObj._id.toString() : null,
          userName: userObj ? userObj.userName : null,
          userEmail: userObj ? userObj.email : null,
        };
      }),
      totalElements: total,
      totalPages: Math.ceil(total / size),
      size,
      number: page,
    };
  }

  static async listActiveTiers(): Promise<Record<string, unknown>[]> {
    const tiers = await Tier.find({ isActive: true });
    return tiers.map(t => ({
      tierId: t._id.toString(),
      title: t.title,
      amount: t.amount,
      noMonth: t.noMonth,
      limitedToken: t.limitedToken,
      isActive: t.isActive
    }));
  }

  private static async applyPaidOrder(order: IOrder, rawPayload?: Record<string, unknown>): Promise<void> {
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: { $ne: OrderStatus.Paid } },
      { status: OrderStatus.Paid, paidAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!claimed) return;

    await Transaction.create({
      orderId: claimed._id,
      amount: claimed.amount,
      paymentLinkId: claimed.paymentLinkId,
      payload: rawPayload,
      status: TransactionStatus.Success,
      transactionDate: new Date(),
    });

    const [tier, user] = await Promise.all([
      Tier.findById(claimed.tierId),
      User.findById(claimed.uid),
    ]);
    if (tier && user) {
      const now = new Date();
      const base = user.tierExpiresAt && user.tierExpiresAt > now ? user.tierExpiresAt : now;
      user.tierId = tier._id as mongoose.Types.ObjectId;
      user.tierExpiresAt = addMonths(base, tier.noMonth);
      user.token = (user.token || 0) + (tier.limitedToken || 0);
      user.lastTokenResetAt = now;
      await user.save();
    }
  }

  static async handlePayOSReturn(userId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { cancel, orderCode } = data;
    const order = await Order.findOne({ orderCode: orderCode as number, uid: userId });
    if (!order) throw new AppError('Order not found', 404);

    if (order.status === OrderStatus.Pending && payos.isConfigured) {
      try {
        const info = await payos.getPaymentLinkInformation(orderCode as number);
        const remoteStatus = String(info.status || '').toUpperCase();
        if (remoteStatus === 'PAID') {
          await this.applyPaidOrder(order, info);
          order.status = OrderStatus.Paid;
        } else if (remoteStatus === 'CANCELLED' || remoteStatus === 'EXPIRED') {
          order.status = remoteStatus === 'EXPIRED' ? OrderStatus.Expired : OrderStatus.Cancelled;
          await order.save();
        }
      } catch {
        // fallback
        if (cancel === true) {
          order.status = OrderStatus.Cancelled;
          await order.save();
        }
      }
    }

    let message = 'Payment is pending. Please wait for confirmation.';
    if (order.status === OrderStatus.Paid) message = 'Payment has already been confirmed.';
    else if (order.status === OrderStatus.Cancelled) message = 'Payment has been cancelled.';
    else if (order.status === OrderStatus.Expired) message = 'Payment link has expired. Please create a new order.';

    return {
      orderCode: order.orderCode,
      resolvedStatus: order.status.toUpperCase(),
      message
    };
  }

  static async handleWebhook(data: WebhookData, rawPayload: Record<string, unknown>): Promise<void> {
    const order = await Order.findOne({ orderCode: data.orderCode });
    if (!order) return;

    if (data.code === '00') {
      await this.applyPaidOrder(order, rawPayload);
    } else if (order.status === OrderStatus.Pending) {
      await Transaction.create({
        orderId: order._id,
        amount: order.amount,
        paymentLinkId: order.paymentLinkId,
        payload: rawPayload,
        status: TransactionStatus.Failed,
        transactionDate: new Date(),
      });
    }
  }
}
