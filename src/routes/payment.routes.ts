import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { paymentLimiter } from '../middlewares/rate-limit.middleware';
import { createOrderSchema } from '../validations/payment.validation';
import { UserRole } from '../types/enums';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Payments
 *   description: Payment and Tier management
 */

/**
 * @openapi
 * /payments/checkout:
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
 *       200:
 *         description: Checkout link created successfully
 */
router.post('/checkout', authenticate, paymentLimiter, validate(createOrderSchema), PaymentController.createCheckout);

/**
 * @openapi
 * /payments/me:
 *   get:
 *     tags: [Payments]
 *     summary: List my payment history
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */
router.get('/me', authenticate, authorizeRoles(UserRole.Customer), PaymentController.getMyPaymentHistory);

/**
 * @openapi
 * /payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get all payment history (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: All payment history retrieved successfully
 */
router.get('/history', authenticate, authorizeRoles(UserRole.SystemAdmin), PaymentController.getAllPaymentHistory);

/**
 * @openapi
 * /payments/tiers:
 *   get:
 *     tags: [Payments]
 *     summary: Get all active subscription tiers
 *     responses:
 *       200:
 *         description: List of active tiers retrieved successfully
 */
router.get('/tiers', PaymentController.listTiers);

/**
 * @openapi
 * /payments/payos/return:
 *   post:
 *     tags: [Payments]
 *     summary: Handle PayOS return redirect/data
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Return handled successfully
 */
router.post('/payos/return', authenticate, PaymentController.handlePayOSReturn);

/**
 * @openapi
 * /payments/payos/webhook:
 *   get:
 *     tags: [Payments]
 *     summary: Verify PayOS webhook endpoint (reachability check)
 *     responses:
 *       200:
 *         description: Webhook acknowledged
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
router.get('/payos/webhook', PaymentController.webhookVerify);
router.post('/payos/webhook', PaymentController.webhook);

/**
 * @openapi
 * /payments/webhook:
 *   get:
 *     tags: [Payments]
 *     summary: Verify webhook endpoint (alias)
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *   post:
 *     tags: [Payments]
 *     summary: PayOS webhook alias (server-to-server, public, HMAC-verified)
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 */
router.get('/webhook', PaymentController.webhookVerify);
router.post('/webhook', PaymentController.webhook);

export default router;
