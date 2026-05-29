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
 */
router.get('/overview', DashboardController.getOverview);

/**
 * @openapi
 * /system-admin/dashboard/users:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get user analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/users', DashboardController.getUserAnalytics);

/**
 * @openapi
 * /system-admin/dashboard/content:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get content summary
 *     security:
 *       - BearerAuth: []
 */
router.get('/content', DashboardController.getContentSummary);

/**
 * @openapi
 * /system-admin/dashboard/chat-activity:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get chat activity metrics
 *     security:
 *       - BearerAuth: []
 */
router.get('/chat-activity', DashboardController.getChatActivity);

/**
 * @openapi
 * /system-admin/dashboard/system-health:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get system health metrics
 *     security:
 *       - BearerAuth: []
 */
router.get('/system-health', DashboardController.getSystemHealth);

/**
 * @openapi
 * /system-admin/dashboard/revenue:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get revenue metrics
 *     security:
 *       - BearerAuth: []
 */
router.get('/revenue', DashboardController.getRevenue);

/**
 * @openapi
 * /system-admin/dashboard/payments:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get payment transactions
 *     security:
 *       - BearerAuth: []
 */
router.get('/payments', DashboardController.getPayments);

/**
 * @openapi
 * /system-admin/dashboard/tiers:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get subscription tier analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/tiers', DashboardController.getTiers);

/**
 * @openapi
 * /system-admin/dashboard/quiz:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get quiz analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/quiz', DashboardController.getQuiz);

/**
 * @openapi
 * /system-admin/dashboard/tokens:
 *   get:
 *     tags: [System Admin Dashboard]
 *     summary: Get token usage analytics
 *     security:
 *       - BearerAuth: []
 */
router.get('/tokens', DashboardController.getTokens);

export default router;
