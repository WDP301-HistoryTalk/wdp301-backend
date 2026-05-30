import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Payments
 *   description: Payment and Tier management
 */

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

export default router;
