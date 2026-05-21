import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/historical-contexts?search&page&limit&era&category
router.get('/', (_req: Request, res: Response) => {
  // TODO: implement — paginated list, filter by era + category
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// GET /api/v1/historical-contexts/:id
router.get('/:id', (_req: Request, res: Response) => {
  // TODO: implement — get historical context detail
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/historical-contexts  [STAFF | ADMIN]
router.post('/', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — create historical context
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PUT /api/v1/historical-contexts/:id  [STAFF | ADMIN]
router.put('/:id', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — update historical context
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// DELETE /api/v1/historical-contexts/:id  [STAFF | ADMIN]
router.delete('/:id', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — permanent delete
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PATCH /api/v1/historical-contexts/:id/soft-delete  [STAFF | ADMIN]
router.patch('/:id/soft-delete', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — set deletedAt
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
