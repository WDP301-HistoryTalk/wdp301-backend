import { Router } from 'express';
import { TierController } from '../controllers/tier.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Tiers
 *   description: Subscription Tier management
 */

/**
 * @openapi
 * /tiers:
 *   get:
 *     tags: [Tiers]
 *     summary: Get all active subscription tiers
 */
router.get('/', TierController.listTiers);

/**
 * @openapi
 * /tiers/{id}:
 *   get:
 *     tags: [Tiers]
 *     summary: Get a subscription tier by ID
 */
router.get('/:id', TierController.getTierById);

// Admin-only Tier write routes

/**
 * @openapi
 * /tiers:
 *   post:
 *     tags: [Tiers]
 *     summary: Create a subscription tier (Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.post('/', authenticate, authorizeRoles(UserRole.SystemAdmin), TierController.createTier);

/**
 * @openapi
 * /tiers/{id}:
 *   put:
 *     tags: [Tiers]
 *     summary: Update a subscription tier (Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.put('/:id', authenticate, authorizeRoles(UserRole.SystemAdmin), TierController.updateTier);

/**
 * @openapi
 * /tiers/{id}:
 *   delete:
 *     tags: [Tiers]
 *     summary: Deactivate a subscription tier (Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.delete('/:id', authenticate, authorizeRoles(UserRole.SystemAdmin), TierController.deleteTier);

export default router;
