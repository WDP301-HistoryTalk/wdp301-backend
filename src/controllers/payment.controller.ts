import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { payos, WebhookData } from '../services/payos.client';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export class PaymentController {
  /** POST /payments/orders — create an order + PayOS checkout link. */
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PaymentService.createOrder(req.user!.id, req.body.tierId);
      sendSuccess(res, data, 'Tạo liên kết thanh toán thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  /** GET /payments/orders — list the caller's orders. */
  static async listMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 10;
      const data = await PaymentService.listMyOrders(req.user!.id, page, size);
      sendSuccess(res, data, 'Lấy danh sách đơn hàng thành công');
    } catch (error) {
      next(error);
    }
  }

  /** GET /payments/orders/:orderCode — status of one order (lazy-syncs with PayOS). */
  static async getOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderCode = parseInt(req.params.orderCode as string, 10);
      const data = await PaymentService.getOrderStatus(req.user!.id, orderCode);
      sendSuccess(res, data, 'Lấy trạng thái đơn hàng thành công');
    } catch (error) {
      next(error);
    }
  }

  /** POST /payments/orders/:orderCode/cancel — cancel a pending order. */
  static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderCode = parseInt(req.params.orderCode as string, 10);
      const data = await PaymentService.cancelOrder(req.user!.id, orderCode);
      sendSuccess(res, data, 'Huỷ đơn hàng thành công');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /payments/webhook — PayOS server-to-server callback. PUBLIC (no auth):
   * trust is established by HMAC signature verification, not by a JWT.
   */
  static async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as { data: WebhookData; signature?: string };
      const data = payos.verifyWebhookData(body); // throws on bad signature
      await PaymentService.handleWebhook(data, body as unknown as Record<string, unknown>);
      // Always ACK a verified webhook so PayOS stops retrying.
      sendSuccess(res, null, 'Webhook processed');
    } catch (error) {
      logger.error('PayOS webhook error', (error as Error).message);
      next(error);
    }
  }
}
