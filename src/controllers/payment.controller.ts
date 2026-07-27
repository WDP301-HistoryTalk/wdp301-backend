import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { payos, WebhookData } from '../services/payos.client';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export class PaymentController {
  static async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PaymentService.createPayOSCheckout(req.user!.id, req.body.tierId, req.body.platform);
      sendSuccess(res, data, 'Payment checkout created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PaymentService.getMyPaymentHistory(req.user!.id);
      sendSuccess(res, data, 'Payment history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const userId = req.query.userId as string | undefined;
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 20;

      const data = await PaymentService.getAllPaymentHistory(status, userId, page, size);
      sendSuccess(res, data, 'Payment history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listTiers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PaymentService.listActiveTiers();
      sendSuccess(res, data, 'Tiers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async handlePayOSReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PaymentService.handlePayOSReturn(req.user!.id, req.body);
      sendSuccess(res, data, data.message as string);
    } catch (error) {
      next(error);
    }
  }

  static async webhookVerify(_req: Request, res: Response): Promise<void> {
    res.status(200).send('OK');
  }

  static async webhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      console.log('--- PAYOS WEBHOOK TEST ---');
      console.log('Headers:', req.headers);
      console.log('Body:', JSON.stringify(req.body));
      console.log('--------------------------');

      const body = req.body as { data: WebhookData; signature?: string };
      
      if (!body || body.data === null || !body.signature || (body.data && body.data.orderCode === 123)) {
        logger.info('Received PayOS webhook verification/test request, returning 200 OK');
        res.status(200).send('OK');
        return;
      }

      try {
        const data = payos.verifyWebhookData(body);
        await PaymentService.handleWebhook(data, body as unknown as Record<string, unknown>);
      } catch (verifyError) {
        logger.warn('PayOS webhook signature verification failed, returning 200 OK to acknowledge', (verifyError as Error).message);
      }

      res.status(200).send('OK');
    } catch (error) {
      logger.error('PayOS webhook error', (error as Error).message);
      res.status(500).send('Internal Server Error');
    }
  }
}
