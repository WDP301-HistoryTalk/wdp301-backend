import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/characters?search&page&limit&era
router.get('/', (_req: Request, res: Response) => {
  // TODO: implement — paginated list, filter by era
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// GET /api/v1/characters/context/:contextId  — must be before /:id
router.get('/context/:contextId', (_req: Request, res: Response) => {
  // TODO: implement — list characters belonging to a historical context
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// GET /api/v1/characters/:id
router.get('/:id', (_req: Request, res: Response) => {
  // TODO: implement — get character detail
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/characters  [STAFF | ADMIN]
router.post('/', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — create character
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PUT /api/v1/characters/:id  [STAFF | ADMIN]
router.put('/:id', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — update character
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// DELETE /api/v1/characters/:id  [STAFF | ADMIN]
router.delete('/:id', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — permanent delete
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PATCH /api/v1/characters/:id/soft-delete  [STAFF | ADMIN]
router.patch('/:id/soft-delete', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — set deletedAt
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/characters/:characterId/contexts/:contextId  [STAFF | ADMIN]
router.post('/:characterId/contexts/:contextId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — attach character to a historical context
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
