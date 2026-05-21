import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Static routes must come before /:quizId to avoid param collision

// GET /api/v1/quizzes/results/me  [auth required]
router.get('/results/me', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — paginated quiz results for the current user
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/quizzes/submit  [auth required]
router.post('/submit', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — submit answers, return score + correctAnswers + wrongAnswers
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// GET /api/v1/quizzes?search
router.get('/', (_req: Request, res: Response) => {
  // TODO: implement — flat array response (no pagination per contract)
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// GET /api/v1/quizzes/:quizId
router.get('/:quizId', (_req: Request, res: Response) => {
  // TODO: implement — get quiz metadata
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/quizzes/:quizId/start  [auth required]
router.post('/:quizId/start', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — create quiz session, return questions with correctAnswer
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
