import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { UserRole } from '../types/enums';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  registerContentAdminSchema,
} from '../validations/auth.validation';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Something went wrong
 *         data:
 *           nullable: true
 *           example: null
 *         timestamp:
 *           type: string
 *           example: "2025-05-22T10:00:00.000Z"
 *     RegisterBody:
 *       type: object
 *       required: [userName, email, password, confirmPassword]
 *       properties:
 *         userName:
 *           type: string
 *           example: Nguyen Van A
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           minLength: 6
 *           example: password123
 *         confirmPassword:
 *           type: string
 *           example: password123
 *     LoginBody:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           example: password123
 *     LoginData:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *           example: 64a1b2c3d4e5f6789abcdef0
 *         userName:
 *           type: string
 *           example: Nguyen Van A
 *         email:
 *           type: string
 *           example: user@example.com
 *         role:
 *           type: string
 *           enum: [CUSTOMER, CONTENT_ADMIN, SYSTEM_ADMIN]
 *           example: CUSTOMER
 *         accessToken:
 *           type: string
 *           example: eyJ...
 *         refreshToken:
 *           type: string
 *           example: eyJ...
 *         tokenType:
 *           type: string
 *           example: Bearer
 *         expiresIn:
 *           type: integer
 *           example: 900
 *     TokenPairData:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           example: eyJ...
 *         refreshToken:
 *           type: string
 *           example: eyJ...
 *         tokenType:
 *           type: string
 *           example: Bearer
 *         expiresIn:
 *           type: integer
 *           example: 900
 *     RegisterContentAdminBody:
 *       type: object
 *       required: [userName, email, password, confirmPassword, roleName]
 *       properties:
 *         userName:
 *           type: string
 *           example: Content Admin
 *         email:
 *           type: string
 *           format: email
 *           example: admin@example.com
 *         password:
 *           type: string
 *           minLength: 6
 *           example: password123
 *         confirmPassword:
 *           type: string
 *           example: password123
 *         roleName:
 *           type: string
 *           enum: [CONTENT_ADMIN, SYSTEM_ADMIN]
 *           example: CONTENT_ADMIN
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBody'
 *     responses:
 *       200:
 *         description: Registration successful
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
 *                     message: { type: string, example: Registration successful. Please log in. }
 *                 timestamp: { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and receive JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/LoginData'
 *                 timestamp: { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Invalidate the current refresh token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new token pair
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJ...
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/TokenPairData'
 *                 timestamp: { type: string }
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refresh);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in or register via Google OAuth ID token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 example: google-id-token
 *     responses:
 *       200:
 *         description: Auth successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/LoginData'
 *                 timestamp: { type: string }
 *       400:
 *         description: Invalid ID token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/google', authLimiter, validate(googleAuthSchema), AuthController.googleAuth);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send a password-reset link to the given email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Reset email sent (same response whether email exists or not)
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the token from the email link
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password/:token', validate(resetPasswordSchema), AuthController.resetPassword);

/**
 * @openapi
 * /auth/register-content-admin:
 *   post:
 *     tags: [Auth]
 *     summary: Create a staff account (SystemAdmin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterContentAdminBody'
 *     responses:
 *       200:
 *         description: Staff account created
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — requires SystemAdmin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/register-content-admin',
  authenticate,
  authorize(UserRole.SystemAdmin),
  validate(registerContentAdminSchema),
  AuthController.registerContentAdmin
);

export default router;
