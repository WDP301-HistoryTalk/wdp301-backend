import { Router } from 'express';
import userRoutes from './user.routes';

const router = Router();

// Register sub-routers
router.use('/users', userRoutes);

export default router;
