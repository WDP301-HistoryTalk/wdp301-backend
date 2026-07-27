import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// All routes require SYSTEM_ADMIN role
router.use(authenticate, authorizeRoles(UserRole.SystemAdmin));

/**
 * @openapi
 * tags:
 *   name: System Admin Dashboard
 *   description: Administrative analytics and dashboard endpoints
 */

/**
 * @openapi
 * /system-admin/dashboard/overview:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get dashboard overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Dashboard overview retrieved successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         total: { type: integer, example: 100 }
 *                         active: { type: integer, example: 80 }
 *                         inactive: { type: integer, example: 20 }
 *                         deleted: { type: integer, example: 5 }
 *                         newToday: { type: integer, example: 2 }
 *                         newThisMonth: { type: integer, example: 15 }
 *                     roles:
 *                       type: object
 *                       properties:
 *                         customers: { type: integer, example: 90 }
 *                         contentAdmins: { type: integer, example: 8 }
 *                         systemAdmins: { type: integer, example: 2 }
 *                     content:
 *                       type: object
 *                       properties:
 *                         historicalContexts: { type: integer, example: 10 }
 *                         publishedHistoricalContexts: { type: integer, example: 8 }
 *                         characters: { type: integer, example: 25 }
 *                         publishedCharacters: { type: integer, example: 20 }
 *                         documents: { type: integer, example: 12 }
 *                     chat:
 *                       type: object
 *                       properties:
 *                         sessions: { type: integer, example: 150 }
 *                         messages: { type: integer, example: 1200 }
 *                         messagesToday: { type: integer, example: 45 }
 *                     topCharacters:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           characterId: { type: string, example: "60d5ec49f1b2c81184a7e9a1" }
 *                           name: { type: string, example: "Quang Trung" }
 *                           title: { type: string, example: "Hoàng đế Nguyễn Huệ" }
 *                           imageUrl: { type: string, example: "https://example.com/avatar.jpg" }
 *                           totalMessages: { type: integer, example: 250 }
 *                           userMessages: { type: integer, example: 120 }
 *                           aiMessages: { type: integer, example: 130 }
 *                     systemHealth:
 *                       type: object
 *                       properties:
 *                         status: { type: string, example: "UP" }
 *                         lastCheckedAt: { type: string, example: "2026-07-27T15:00:00.000Z" }
 */
router.get('/overview', DashboardController.getOverview);

/**
 * @openapi
 * /system-admin/users:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get user analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/users', DashboardController.getUserAnalytics);

/**
 * @openapi
 * /system-admin/content:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get content summary
 *     security:
 *       - BearerAuth: []
 */
router.get('/content', DashboardController.getContentSummary);

/**
 * @openapi
 * /system-admin/chat-activity:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get chat activity metrics
 *     security:
 *       - BearerAuth: []
 */
router.get('/chat-activity', DashboardController.getChatActivity);

/**
 * @openapi
 * /system-admin/system-health:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get system health metrics
 *     security:
 *       - BearerAuth: []
 */
router.get('/system-health', DashboardController.getSystemHealth);

/**
 * @openapi
 * /system-admin/revenue:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get revenue metrics
 *     security:
 *       - BearerAuth: []
 */
router.get('/revenue', DashboardController.getRevenue);

/**
 * @openapi
 * /system-admin/payments:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get payment transactions
 *     security:
 *       - BearerAuth: []
 */
router.get('/payments', DashboardController.getPayments);

/**
 * @openapi
 * /system-admin/tiers:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get subscription tier analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/tiers', DashboardController.getTiers);

/**
 * @openapi
 * /system-admin/quiz:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get quiz analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/quiz', DashboardController.getQuiz);

/**
 * @openapi
 * /system-admin/tokens:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get token usage analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/tokens', DashboardController.getTokens);

/**
 * @openapi
 * /system-admin/dashboard/test-notification:
 *   post:
 *     tags: [System Admin Dashboard]
 *     summary: Send a test push notification (of an existing type) to the current admin's own devices
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [daily_reminder, payment_success, subscription_expired]
 */
router.post('/test-notification', DashboardController.testNotification);

export default router;
