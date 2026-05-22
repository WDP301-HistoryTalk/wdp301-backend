import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { HistoricalContextController } from '../controllers/historical-context.controller';
import { UserRole } from '../types/enums';

const router = Router();
const staffOrAdmin = [UserRole.ContentAdmin, UserRole.SystemAdmin];

// GET /api/v1/historical-contexts?search&page&limit&era&category
router.get('/', HistoricalContextController.list);

// GET /api/v1/historical-contexts/:id
router.get('/:id', HistoricalContextController.getById);

// POST /api/v1/historical-contexts  [STAFF | ADMIN]
router.post('/', authenticate, authorize(...staffOrAdmin), HistoricalContextController.create);

// PUT /api/v1/historical-contexts/:id  [STAFF | ADMIN]
router.put('/:id', authenticate, authorize(...staffOrAdmin), HistoricalContextController.update);

// DELETE /api/v1/historical-contexts/:id  [STAFF | ADMIN]
router.delete('/:id', authenticate, authorize(...staffOrAdmin), HistoricalContextController.delete);

// PATCH /api/v1/historical-contexts/:id/soft-delete  [STAFF | ADMIN]
router.patch('/:id/soft-delete', authenticate, authorize(...staffOrAdmin), HistoricalContextController.softDelete);

// PATCH /api/v1/historical-contexts/:id/toggle-active  [STAFF | ADMIN]
router.patch('/:id/toggle-active', authenticate, authorize(...staffOrAdmin), HistoricalContextController.toggleActive);

export default router;
