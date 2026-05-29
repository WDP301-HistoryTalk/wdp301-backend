import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// All routes require SYSTEM_ADMIN role
router.use(authenticate, authorizeRoles(UserRole.SystemAdmin));

router.get('/overview', DashboardController.getOverview);
router.get('/users', DashboardController.getUserAnalytics);
router.get('/content', DashboardController.getContentSummary);
router.get('/chat-activity', DashboardController.getChatActivity);
router.get('/system-health', DashboardController.getSystemHealth);
router.get('/revenue', DashboardController.getRevenue);
router.get('/payments', DashboardController.getPayments);
router.get('/tiers', DashboardController.getTiers);
router.get('/quiz', DashboardController.getQuiz);
router.get('/tokens', DashboardController.getTokens);

export default router;
