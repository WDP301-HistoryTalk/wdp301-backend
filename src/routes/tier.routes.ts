import { Router } from 'express';
import { TierController } from '../controllers/tier.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// Protect all tier routes for SYSTEM_ADMIN only
router.use(authenticate);
router.use(authorizeRoles(UserRole.SystemAdmin));

router.get('/', TierController.list);
router.get('/:id', TierController.getById);
router.post('/', TierController.create);
router.put('/:id', TierController.update);
router.patch('/:id', TierController.update);
router.delete('/:id', TierController.delete);

export default router;
