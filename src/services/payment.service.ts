import mongoose from 'mongoose';
import Order, { IOrder } from '../models/order.model';
import Transaction from '../models/transaction.model';
import Tier from '../models/tier.model';
import User from '../models/user.model';
import { AppError } from '../utils/app-error';
import { config } from '../config';
import { OrderStatus, TransactionStatus } from '../types/enums';
import { payos, WebhookData } from './payos.client';

/** Generate a PayOS-safe order code: positive integer < 2^53, unique in our DB. */
async function generateOrderCode(): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt++) {
    // ms timestamp (~13 digits) + 3 random digits => ~1.7e15, well under 2^53.
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
  /**
   * Create a pending order for a tier and a PayOS checkout link.
   * Returns the data the frontend needs to redirect / render the QR.
   */
  static async createOrder(userId: string, tierId: string): Promise<Record<string, unknown>> {
    const tier = await Tier.findOne({ _id: tierId, isActive: true });
    if (!tier) {
      throw new AppError('Không tìm thấy gói dịch vụ hoặc gói đã ngừng bán', 404);
    }
    if (tier.amount <= 0) {
      throw new AppError('Gói miễn phí không cần thanh toán', 400);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    const orderCode = await generateOrderCode();

    // Create the local order first so we always have a record even if PayOS fails.
    const order = await Order.create({
      uid: new mongoose.Types.ObjectId(userId),
      tierId: tier._id,
      orderCode,
      amount: tier.amount,
      status: OrderStatus.Pending,
    });

    // PayOS hard-limits description to 25 chars.
    const description = `Goi ${tier.title}`.slice(0, 25);

    try {
      const link = await payos.createPaymentLink({
        orderCode,
        amount: tier.amount,
        description,
        returnUrl: `${config.payos.returnUrl}?orderCode=${orderCode}`,
        cancelUrl: `${config.payos.cancelUrl}?orderCode=${orderCode}&cancel=true`,
        buyerName: user.fullName || user.userName,
        buyerEmail: user.email,
        items: [{ name: `Gói ${tier.title}`, quantity: 1, price: tier.amount }],
      });

      order.paymentLinkId = link.paymentLinkId;
      order.checkoutUrl = link.checkoutUrl;
      order.qrCode = link.qrCode;
      await order.save();

      return {
        orderId: order._id.toString(),
        orderCode,
        amount: tier.amount,
        status: order.status,
        checkoutUrl: link.checkoutUrl,
        qrCode: link.qrCode,
        paymentLinkId: link.paymentLinkId,
        bin: link.bin,
        accountNumber: link.accountNumber,
        accountName: link.accountName,
        expiresAt: order.createdAt,
      };
    } catch (err) {
      // Roll the local order into a failed state so it isn't left dangling.
      order.status = OrderStatus.Cancelled;
      await order.save();
      throw err;
    }
  }

  /**
   * Apply a successful payment to an order exactly once.
   * Shared by the webhook and the polling/lazy-sync path, so it MUST be idempotent.
   *
   * Idempotency is enforced with a single atomic conditional update that "claims"
   * the order (Pending/any -> Paid). Only the claiming caller proceeds to grant the
   * tier, so concurrent webhook + poll cannot double-credit. We avoid multi-document
   * transactions on purpose — they require a replica set, which dev/standalone Mongo
   * (and mongodb-memory-server) doesn't provide.
   */
  private static async applyPaidOrder(order: IOrder, rawPayload?: Record<string, unknown>): Promise<void> {
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: { $ne: OrderStatus.Paid } },
      { status: OrderStatus.Paid, paidAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!claimed) return; // already processed by a concurrent caller

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
      // Extend subscription: if still subscribed, stack onto remaining time.
      const now = new Date();
      const base = user.tierExpiresAt && user.tierExpiresAt > now ? user.tierExpiresAt : now;

      user.tierId = tier._id as mongoose.Types.ObjectId;
      user.tierExpiresAt = addMonths(base, tier.noMonth);
      // One-time token grant on purchase; mark reset so today's daily reset won't double-credit.
      user.token = (user.token || 0) + (tier.limitedToken || 0);
      user.lastTokenResetAt = now;
      await user.save();
    }
  }

  /**
   * Handle a PayOS webhook. The signature is verified by the caller (controller)
   * via payos.verifyWebhookData, which returns the trusted `data` block.
   */
  static async handleWebhook(data: WebhookData, rawPayload: Record<string, unknown>): Promise<void> {
    // PayOS sends a confirmation ping (orderCode 123) when registering the URL.
    const order = await Order.findOne({ orderCode: data.orderCode });
    if (!order) return; // unknown order (or test ping) — ACK so PayOS stops retrying

    // code '00' === successful payment.
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

  /**
   * Get an order's status for the owning user. If still pending, lazily reconcile
   * with PayOS so frontend polling works even if the webhook was missed/delayed.
   */
  static async getOrderStatus(userId: string, orderCode: number): Promise<Record<string, unknown>> {
    const order = await Order.findOne({ orderCode, uid: userId });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);

    if (order.status === OrderStatus.Pending && payos.isConfigured) {
      try {
        const info = await payos.getPaymentLinkInformation(orderCode);
        const remoteStatus = String(info.status || '').toUpperCase();
        if (remoteStatus === 'PAID') {
          await this.applyPaidOrder(order, info);
          order.status = OrderStatus.Paid;
        } else if (remoteStatus === 'CANCELLED' || remoteStatus === 'EXPIRED') {
          order.status = remoteStatus === 'EXPIRED' ? OrderStatus.Expired : OrderStatus.Cancelled;
          await order.save();
        }
      } catch {
        // Reconciliation is best-effort; fall back to stored status.
      }
    }

    return {
      orderId: order._id.toString(),
      orderCode: order.orderCode,
      amount: order.amount,
      status: order.status,
      tierId: order.tierId.toString(),
      checkoutUrl: order.checkoutUrl,
      qrCode: order.qrCode,
      paidAt: order.paidAt ?? null,
      createdAt: order.createdAt,
    };
  }

  static async cancelOrder(userId: string, orderCode: number): Promise<Record<string, unknown>> {
    const order = await Order.findOne({ orderCode, uid: userId });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (order.status !== OrderStatus.Pending) {
      throw new AppError('Chỉ có thể huỷ đơn hàng đang chờ thanh toán', 400);
    }

    if (payos.isConfigured) {
      await payos.cancelPaymentLink(orderCode, 'Người dùng huỷ đơn').catch(() => undefined);
    }
    order.status = OrderStatus.Cancelled;
    await order.save();

    return { orderCode: order.orderCode, status: order.status };
  }

  static async listMyOrders(userId: string, page = 0, size = 10): Promise<Record<string, unknown>> {
    const skip = page * size;
    const [orders, total] = await Promise.all([
      Order.find({ uid: userId })
        .populate('tierId', 'title amount noMonth')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(size),
      Order.countDocuments({ uid: userId }),
    ]);

    return {
      content: orders.map((o) => ({
        orderId: o._id.toString(),
        orderCode: o.orderCode,
        amount: o.amount,
        status: o.status,
        tier: o.tierId,
        checkoutUrl: o.checkoutUrl,
        paidAt: o.paidAt ?? null,
        createdAt: o.createdAt,
      })),
      totalElements: total,
      totalPages: Math.ceil(total / size),
      currentPage: page,
      pageSize: size,
      hasNext: skip + size < total,
      hasPrevious: page > 0,
    };
  }
}
