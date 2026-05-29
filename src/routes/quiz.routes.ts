import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Static routes must come before /:quizId to avoid param collision

/**
 * @openapi
 * tags:
 *   name: Quizzes
 *   description: Quiz management and taking
 */

/**
 * @openapi
 * /quizzes/results/me:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get my quiz results
 *     security:
 *       - BearerAuth: []
 */
router.get('/results/me', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — paginated quiz results for the current user
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /quizzes/submit:
 *   post:
 *     tags: [Quizzes]
 *     summary: Submit quiz answers
 *     security:
 *       - BearerAuth: []
 */
router.post('/submit', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — submit answers, return score + correctAnswers + wrongAnswers
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /quizzes:
 *   get:
 *     tags: [Quizzes]
 *     summary: List quizzes
 */
router.get('/', (_req: Request, res: Response) => {
  // TODO: implement — flat array response (no pagination per contract)
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /quizzes/{quizId}:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz by ID
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:quizId', (_req: Request, res: Response) => {
  // TODO: implement — get quiz metadata
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /quizzes/{quizId}/start:
 *   post:
 *     tags: [Quizzes]
 *     summary: Start a quiz session
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:quizId/start', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — create quiz session, return questions with correctAnswer
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
