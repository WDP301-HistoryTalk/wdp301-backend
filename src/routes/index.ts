import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import characterRoutes from './character.routes';
import historicalContextRoutes from './historical-context.routes';
import chatRoutes from './chat.routes';
import quizRoutes from './quiz.routes';
import staffRoutes from './staff.routes';
import documentRoutes from './document.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/characters', characterRoutes);
router.use('/historical-contexts', historicalContextRoutes);
router.use('/chat', chatRoutes);
router.use('/quizzes', quizRoutes);
router.use('/staff', staffRoutes);
router.use('/', documentRoutes); // historical-documents & character-documents

export default router;
