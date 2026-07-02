import { Router } from 'express';
import { TierController } from '../controllers/tier.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// Protect all tier routes for SYSTEM_ADMIN only
router.use(authenticate);
router.use(authorizeRoles(UserRole.SystemAdmin));

/**
 * @openapi
 * tags:
 *   name: System Admin Tiers
 *   description: Tier management for SYSTEM_ADMIN
 */

/**
 * @openapi
 * /system-admin/tiers:
 *   get:
 *     tags: [System Admin Tiers]
 *     summary: Get all tiers
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách gói thành công
 */
router.get('/', TierController.list);

/**
 * @openapi
 * /system-admin/tiers/{id}:
 *   get:
 *     tags: [System Admin Tiers]
 *     summary: Get tier by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thông tin gói thành công
 */
router.get('/:id', TierController.getById);

/**
 * @openapi
 * /system-admin/tiers:
 *   post:
 *     tags: [System Admin Tiers]
 *     summary: Create a new tier
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               amount: { type: number }
 *               noMonth: { type: number }
 *               limitedToken: { type: number }
 *               isActive: { type: boolean }
 *     responses:
 *       201:
 *         description: Tạo gói thành công
 */
router.post('/', TierController.create);

/**
 * @openapi
 * /system-admin/tiers/{id}:
 *   put:
 *     tags: [System Admin Tiers]
 *     summary: Update an existing tier
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               amount: { type: number }
 *               noMonth: { type: number }
 *               limitedToken: { type: number }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Cập nhật gói thành công
 */
router.put('/:id', TierController.update);
router.patch('/:id', TierController.update);

/**
 * @openapi
 * /system-admin/tiers/{id}:
 *   delete:
 *     tags: [System Admin Tiers]
 *     summary: Delete a tier
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa gói thành công
 */
router.delete('/:id', TierController.delete);

export default router;
