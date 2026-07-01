import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import characterRoutes from './character.routes';
import historicalContextRoutes from './historical-context.routes';
import chatRoutes from './chat.routes';
import quizRoutes from './quiz.routes';
import staffRoutes from './staff.routes';
import documentRoutes from './document.routes';
import dashboardRoutes from './dashboard.routes';
import paymentRoutes from './payment.routes';
import tierRoutes from './tier.routes';
import systemTrashRoutes from './system-trash.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/characters', characterRoutes);
router.use('/historical-contexts', historicalContextRoutes);
router.use('/chat', chatRoutes);
router.use('/quizzes', quizRoutes);
router.use('/staff', staffRoutes);
router.use('/system-admin/dashboard', dashboardRoutes);
router.use('/payments', paymentRoutes);
router.use('/payments/tiers', tierRoutes); // Alias for frontend compatibility with Java
router.use('/tiers', tierRoutes);
router.use('/system/trash', systemTrashRoutes);
router.use('/', documentRoutes); // historical-documents & character-documents

export default router;
