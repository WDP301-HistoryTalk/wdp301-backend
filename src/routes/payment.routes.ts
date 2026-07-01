import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { paymentLimiter } from '../middlewares/rate-limit.middleware';
import { createOrderSchema, orderCodeParamSchema } from '../validations/payment.validation';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Payments
 *   description: PayOS subscription payments
 */

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: PayOS webhook (server-to-server, public, HMAC-verified)
 *     description: >
 *       Called by PayOS after a payment event. Not authenticated — trust is
 *       established by verifying the HMAC-SHA256 signature in the body.
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 */
// IMPORTANT: keep both routes PUBLIC (no authenticate). Verified by signature instead.
// GET: PayOS pings this URL during dashboard registration to verify reachability (mirrors Java @GetMapping("/webhook"))
router.get('/webhook', PaymentController.webhookVerify);
// POST: actual payment notifications from PayOS
router.post('/webhook', PaymentController.webhook);

/**
 * @openapi
 * /payments/orders:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment order and PayOS checkout link
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tierId]
 *             properties:
 *               tierId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Checkout link created
 *   get:
 *     tags: [Payments]
 *     summary: List my orders
 *     security:
 *       - BearerAuth: []
 */
router
  .route('/orders')
  .post(authenticate, paymentLimiter, validate(createOrderSchema), PaymentController.createOrder)
  .get(authenticate, PaymentController.listMyOrders);

/**
 * @openapi
 * /payments/orders/{orderCode}:
 *   get:
 *     tags: [Payments]
 *     summary: Get order status (lazily reconciles with PayOS)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: integer
 */
router.get(
  '/orders/:orderCode',
  authenticate,
  validate(orderCodeParamSchema),
  PaymentController.getOrderStatus
);

/**
 * @openapi
 * /payments/orders/{orderCode}/cancel:
 *   post:
 *     tags: [Payments]
 *     summary: Cancel a pending order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: integer
 */
router.post(
  '/orders/:orderCode/cancel',
  authenticate,
  validate(orderCodeParamSchema),
  PaymentController.cancelOrder
);

export default router;
