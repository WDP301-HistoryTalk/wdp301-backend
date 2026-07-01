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
import systemTrashRoutes from './system-trash.routes';
import tierRoutes from './tier.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin/users', userRoutes); // Alias for Java compatibility
router.use('/characters', characterRoutes);
router.use('/historical-contexts', historicalContextRoutes);
router.use('/chat', chatRoutes);
router.use('/quizzes', quizRoutes);
router.use('/staff', staffRoutes);
router.use('/system-admin/dashboard', dashboardRoutes);
router.use('/system-admin/tiers', tierRoutes);
router.use('/payments', paymentRoutes);
router.use('/system/trash', systemTrashRoutes);
router.use('/', documentRoutes); // historical-documents & character-documents

export default router;
