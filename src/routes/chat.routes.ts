import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/chat/history  — must be before /sessions to avoid param clash
router.get('/history', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — user's chat history grouped by context
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// GET /api/v1/chat/sessions?contextId&characterId
router.get('/sessions', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — sessions for a given context + character
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/chat/sessions
router.post('/sessions', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — create session, auto-generate first ASSISTANT greeting
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// DELETE /api/v1/chat/sessions/:sessionId
router.delete('/sessions/:sessionId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — delete session and all its messages
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// GET /api/v1/chat/sessions/:sessionId/messages
router.get('/sessions/:sessionId/messages', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — messages sorted ASC + suggested questions
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/chat/messages
router.post('/messages', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — send message, call AI, return both userMessage + assistantMessage
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
