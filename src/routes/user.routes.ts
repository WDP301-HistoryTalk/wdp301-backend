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
 *         uid:
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
 *         fullName:
 *           type: string
 *           example: Nguyen Van A Full
 *         dob:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           example: MALE
 *         phoneNumber:
 *           type: string
 *           example: "0123456789"
 *         address:
 *           type: string
 *           example: "123 Street"
 *         avatarUrl:
 *           type: string
 *           example: "https://example.com/avatar.jpg"
 *         tierId:
 *           type: string
 *           example: 64a1b2c3d4e5f6789abcdef1
 *         tierTitle:
 *           type: string
 *           example: Premium
 *         subscriptionEndTime:
 *           type: string
 *           format: date-time
 *         token:
 *           type: integer
 *           example: 10
 *         lastActiveDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         deletedAt:
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
 * /users/me:
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
 *
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change the authenticated user's password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Passwords do not match or incorrect current password
 */

/**
 * @openapi
 * /users/me/dashboard:
 *   get:
 *     tags: [Users]
 *     summary: Get the authenticated user's personalized dashboard analytics (learning and token usage)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User dashboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "User dashboard retrieved successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     learning:
 *                       type: object
 *                       properties:
 *                         totalQuizzesAttempted: { type: integer, example: 15 }
 *                         averageScorePercentage: { type: number, example: 78 }
 *                         eraDistribution:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                           example: { "MODERN": 10, "MEDIEVAL": 5 }
 *                         recentQuizzes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               sessionId: { type: string, example: "64a1b2..." }
 *                               quizTitle: { type: string, example: "Điện Biên Phủ" }
 *                               percentage: { type: number, example: 85 }
 *                               completedAt: { type: string, format: "date-time" }
 *                     aiUsage:
 *                       type: object
 *                       properties:
 *                         currentBalance: { type: integer, example: 1500 }
 *                         tier: { type: string, example: "Premium" }
 *                         totalTokensUsed: { type: integer, example: 4500 }
 *                         promptTokens: { type: integer, example: 1000 }
 *                         completionTokens: { type: integer, example: 3500 }
 *                         topCharacters:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               characterId: { type: string, example: "64a1b..." }
 *                               name: { type: string, example: "Hồ Chí Minh" }
 *                               messageCount: { type: integer, example: 42 }
 *                               tokenUsed: { type: integer, example: 3000 }
 *       401:
 *         description: Missing or invalid token
 */
router.get('/me/dashboard', UserController.getMyDashboard);
router.get('/me', UserController.getProfile);
router.patch('/me', UserController.updateProfile);
router.patch('/me/password', UserController.changePassword);

// --- Admin Methods ---

import { authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (SystemAdmin only)
 *     security:
 *       - BearerAuth: []
 */
router.get('/', authorizeRoles(UserRole.SystemAdmin), UserController.listUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID (SystemAdmin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', authorizeRoles(UserRole.SystemAdmin), UserController.getUserById);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (SystemAdmin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
/**
 * @openapi
 * /users/restore/batch:
 *   patch:
 *     tags: [Users]
 *     summary: Restore multiple deactivated users in batch (SystemAdmin only)
 *     description: >
 *       Restores a list of soft-deleted users. Returns restoredCount, restoredUserIds, and failedUserIds
 *       (users that were not found or already active).
 *       Mirrors Java: PATCH /api/v1/admin/users/restore/batch
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["64a1b2c3d4e5f6789abcdef0", "64a1b2c3d4e5f6789abcdef1"]
 *     responses:
 *       200:
 *         description: Batch user restoration completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     restoredCount: { type: integer, example: 2 }
 *                     restoredUserIds: { type: array, items: { type: string } }
 *                     failedUserIds: { type: array, items: { type: string } }
 *                 message: { type: string }
 *       400:
 *         description: userIds must be a non-empty array
 */
router.patch('/restore/batch', authorizeRoles(UserRole.SystemAdmin), UserController.restoreUsersBatch);

/**
 * @openapi
 * /users/restore/all:
 *   patch:
 *     tags: [Users]
 *     summary: Restore ALL deactivated users (SystemAdmin only)
 *     description: >
 *       Sets deletedAt = null and isActive = true for every soft-deleted user.
 *       Returns the count of restored users.
 *       Mirrors Java: PATCH /api/v1/admin/users/restore/all
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All deactivated users restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: integer, example: 5 }
 *                 message: { type: string, example: "All deactivated users restored successfully (5 users restored)" }
 */
router.patch('/restore/all', authorizeRoles(UserRole.SystemAdmin), UserController.restoreAllUsers);

router.patch('/:id', authorizeRoles(UserRole.SystemAdmin), UserController.adminUpdateUser);

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's role (SystemAdmin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id/role', authorizeRoles(UserRole.SystemAdmin), UserController.updateUserRole);

/**
 * @openapi
 * /users/{id}/deactivate:
 *   patch:
 *     tags: [Users]
 *     summary: Deactivate (soft-delete) a user account (SystemAdmin only)
 *     description: >
 *       Sets deletedAt on the target user and cascade soft-deletes all their
 *       chat sessions, characters, historical contexts, and quiz sessions.
 *       Mirrors Java: PATCH /api/v1/admin/users/{userId}/deactivate
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
 *         description: User account deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: 'null', example: null }
 *                 message: { type: string, example: User account deactivated successfully }
 *                 timestamp: { type: string }
 *       403:
 *         description: Forbidden — only SYSTEM_ADMIN may deactivate other users
 *       404:
 *         description: User not found
 */
router.patch('/:id/deactivate', authorizeRoles(UserRole.SystemAdmin), UserController.deactivateUser);


/**
 * @openapi
 * /users/{id}/restore:
 *   patch:
 *     tags: [Users]
 *     summary: Restore a single deactivated user (SystemAdmin only)
 *     description: >
 *       Clears deletedAt and reactivates a soft-deleted user account.
 *       Returns 400 if the user is already active.
 *       Mirrors Java: PATCH /api/v1/admin/users/{userId}/restore
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
 *         description: User account restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *                 message: { type: string }
 *       400:
 *         description: User account is already active
 *       404:
 *         description: User not found
 */
router.patch('/:id/restore', authorizeRoles(UserRole.SystemAdmin), UserController.restoreUser);

// ── User Avatar Routes (Matches Java /api/v1/users/{userId}/avatar) ──
import { uploadImage } from '../middlewares/upload.middleware';

/**
 * @openapi
 * /users/{userId}/avatar:
 *   post:
 *     tags: [User Avatar]
 *     summary: Upload user avatar directly via multipart/form-data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
router.post('/:userId/avatar', uploadImage, UserController.uploadAvatarDirect);

/**
 * @openapi
 * /users/{userId}/avatar/view-url:
 *   get:
 *     tags: [User Avatar]
 *     summary: Get avatar signed view URL
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Signed view URL generated
 */
router.get('/:userId/avatar/view-url', UserController.generateAvatarViewUrl);

/**
 * @openapi
 * /users/{userId}/avatar:
 *   delete:
 *     tags: [User Avatar]
 *     summary: Delete user avatar
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Avatar deleted
 */
router.delete('/:userId/avatar', UserController.deleteAvatar);

export default router;


