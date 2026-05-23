import { Router } from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { CharacterController } from '../controllers/character.controller';
import { UserRole } from '../types/enums';

const router = Router();
const staffOrAdmin = [UserRole.ContentAdmin, UserRole.SystemAdmin];

// GET /api/v1/characters?search&page&limit&era  [public, optional auth]
router.get('/', optionalAuth, CharacterController.list);

// GET /api/v1/characters/context/:contextId  — must be before /:id  [public, optional auth]
router.get('/context/:contextId', optionalAuth, CharacterController.listByContext);

// GET /api/v1/characters/:id  [public, optional auth]
router.get('/:id', optionalAuth, CharacterController.getById);

// POST /api/v1/characters  [STAFF | ADMIN]
router.post('/', authenticate, authorize(...staffOrAdmin), CharacterController.create);

// PUT /api/v1/characters/:id  [STAFF | ADMIN]
router.put('/:id', authenticate, authorize(...staffOrAdmin), CharacterController.update);

// DELETE /api/v1/characters/:id  [STAFF | ADMIN]
router.delete('/:id', authenticate, authorize(...staffOrAdmin), CharacterController.delete);

// PATCH /api/v1/characters/:id/soft-delete  [STAFF | ADMIN]
router.patch('/:id/soft-delete', authenticate, authorize(...staffOrAdmin), CharacterController.softDelete);

// PATCH /api/v1/characters/:id/toggle-active  [STAFF | ADMIN]
router.patch('/:id/toggle-active', authenticate, authorize(...staffOrAdmin), CharacterController.toggleActive);

// POST /api/v1/characters/:characterId/contexts/:contextId  [STAFF | ADMIN]
router.post('/:characterId/contexts/:contextId', authenticate, authorize(...staffOrAdmin), CharacterController.attachToContext);

export default router;
