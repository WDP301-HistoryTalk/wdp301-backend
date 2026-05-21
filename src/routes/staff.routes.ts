import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes here require STAFF | ADMIN role (checked via authenticate + role guard — TODO)

// GET /api/v1/staff/quizzes?search&grade&era&page&size
router.get('/quizzes', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — paginated quiz list for staff
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// Static sub-paths before /:quizId

// GET /api/v1/staff/quizzes/:quizId
router.get('/quizzes/:quizId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — quiz detail with all questions
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/staff/quizzes
router.post('/quizzes', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — create quiz with questions
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PUT /api/v1/staff/quizzes/:quizId  (metadata only, not questions)
router.put('/quizzes/:quizId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — update quiz metadata (no questions)
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// DELETE /api/v1/staff/quizzes/:quizId
router.delete('/quizzes/:quizId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — permanent delete
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PATCH /api/v1/staff/quizzes/:quizId/soft-delete
router.patch('/quizzes/:quizId/soft-delete', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — set deletedAt
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PATCH /api/v1/staff/quizzes/:quizId/restore
router.patch('/quizzes/:quizId/restore', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — clear deletedAt
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/staff/quizzes/:quizId/questions
router.post('/quizzes/:quizId/questions', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — add question to quiz
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// PUT /api/v1/staff/quizzes/:quizId/questions/:questionId
router.put('/quizzes/:quizId/questions/:questionId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — update question (partial)
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// DELETE /api/v1/staff/quizzes/:quizId/questions/:questionId
router.delete('/quizzes/:quizId/questions/:questionId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — delete question
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
