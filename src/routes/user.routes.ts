import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 64a1b2c3d4e5f6789abcdef0
 *         userName:
 *           type: string
 *           example: Nguyen Van A
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         role:
 *           type: string
 *           enum: [CUSTOMER, CONTENT_ADMIN, SYSTEM_ADMIN]
 *           example: CUSTOMER
 *         token:
 *           type: integer
 *           example: 10
 *         tierId:
 *           type: string
 *           example: 64a1b2c3d4e5f6789abcdef1
 *         lastActiveDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UpdateProfileBody:
 *       type: object
 *       properties:
 *         userName:
 *           type: string
 *           minLength: 2
 *           example: Updated Name
 */

/**
 * @openapi
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get the authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *                 timestamp: { type: string }
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     tags: [Users]
 *     summary: Update the authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileBody'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *                 timestamp: { type: string }
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', UserController.getProfile);
router.patch('/profile', UserController.updateProfile);

export default router;
