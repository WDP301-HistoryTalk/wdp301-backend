import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes here require STAFF | ADMIN role (checked via authenticate + role guard — TODO)

/**
 * @openapi
 * tags:
 *   name: Staff Quizzes
 *   description: Staff quiz management
 */

/**
 * @openapi
 * /staff/quizzes:
 *   get:
 *     tags: [Staff Quizzes]
 *     summary: List quizzes for staff
 *     security:
 *       - BearerAuth: []
 */
router.get('/quizzes', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — paginated quiz list for staff
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// Static sub-paths before /:quizId

/**
 * @openapi
 * /staff/quizzes/{quizId}:
 *   get:
 *     tags: [Staff Quizzes]
 *     summary: Get quiz detail with all questions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/quizzes/:quizId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — quiz detail with all questions
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes:
 *   post:
 *     tags: [Staff Quizzes]
 *     summary: Create a quiz
 *     security:
 *       - BearerAuth: []
 */
router.post('/quizzes', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — create quiz with questions
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes/{quizId}:
 *   put:
 *     tags: [Staff Quizzes]
 *     summary: Update quiz metadata
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/quizzes/:quizId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — update quiz metadata (no questions)
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes/{quizId}:
 *   delete:
 *     tags: [Staff Quizzes]
 *     summary: Delete a quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/quizzes/:quizId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — permanent delete
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes/{quizId}/soft-delete:
 *   patch:
 *     tags: [Staff Quizzes]
 *     summary: Soft delete a quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/quizzes/:quizId/soft-delete', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — set deletedAt
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes/{quizId}/restore:
 *   patch:
 *     tags: [Staff Quizzes]
 *     summary: Restore a soft-deleted quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/quizzes/:quizId/restore', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — clear deletedAt
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes/{quizId}/questions:
 *   post:
 *     tags: [Staff Quizzes]
 *     summary: Add question to quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/quizzes/:quizId/questions', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — add question to quiz
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes/{quizId}/questions/{questionId}:
 *   put:
 *     tags: [Staff Quizzes]
 *     summary: Update a question
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/quizzes/:quizId/questions/:questionId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — update question (partial)
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /staff/quizzes/{quizId}/questions/{questionId}:
 *   delete:
 *     tags: [Staff Quizzes]
 *     summary: Delete a question
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/quizzes/:quizId/questions/:questionId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — delete question
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
