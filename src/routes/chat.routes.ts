import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import ChatController from '../controllers/chat.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Chat
 *   description: Chat session and message management
 */

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

/**
 * @openapi
 * /chat/sessions:
 *   post:
 *     tags: [Chat]
 *     summary: Create a new chat session
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [characterId, contextId]
 *             properties:
 *               characterId:
 *                 type: string
 *               contextId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Chat session created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/sessions', authenticate, ChatController.createSession);

// DELETE /api/v1/chat/sessions/:sessionId
router.delete('/sessions/:sessionId', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — delete session and all its messages
  res.status(501).json({ success: false, message: 'Not implemented' });
});

/**
 * @openapi
 * /chat/sessions/{sessionId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get session and all messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session and message history retrieved
 *       404:
 *         description: Session not found
 */
router.get('/sessions/:sessionId/messages', authenticate, ChatController.getSessionWithMessages);

/**
 * @openapi
 * /chat/sessions/{sessionId}/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message to the AI
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI responded successfully
 *       400:
 *         description: Message is required
 *       500:
 *         description: AI Service error
 */
router.post('/sessions/:sessionId/chat', authenticate, ChatController.chat);

export default router;
