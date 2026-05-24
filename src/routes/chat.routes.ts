import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import ChatController from '../controllers/chat.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Chat
 *   description: Chat session and message management
 */

// GET /api/v1/chat/history — must be before /:sessionId routes
router.get('/history', authenticate, ChatController.getHistory.bind(ChatController));

// GET /api/v1/chat/sessions?contextId&characterId (TODO: filter)
router.get('/sessions', authenticate, ChatController.getHistory.bind(ChatController));

/**
 * @openapi
 * /chat/sessions:
 *   post:
 *     tags: [Chat]
 *     summary: Create a new chat session (also returns AI greeting)
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
 *               characterId: { type: string }
 *               contextId: { type: string }
 *     responses:
 *       201:
 *         description: Session created with greeting message
 */
router.post('/sessions', authenticate, ChatController.createSession.bind(ChatController));

/**
 * @openapi
 * /chat/sessions/{sessionId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get session info and all messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session and message history
 *       404:
 *         description: Session not found
 */
router.get('/sessions/:sessionId/messages', authenticate, ChatController.getSessionWithMessages.bind(ChatController));

/**
 * @openapi
 * /chat/sessions/{sessionId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Soft-delete a chat session
 *     security:
 *       - BearerAuth: []
 */
router.delete('/sessions/:sessionId', authenticate, ChatController.deleteSession.bind(ChatController));

/**
 * @openapi
 * /chat/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message (Java-style — sessionId in body)
 *     description: |
 *       Primary chat endpoint. Send a message and receive an AI response.
 *       The sessionId is passed in the request body (same as Java BE).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, content]
 *             properties:
 *               sessionId: { type: string }
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: Message sent and AI responded
 *       404:
 *         description: Session not found
 *       502:
 *         description: AI service unavailable
 */
router.post('/messages', authenticate, ChatController.sendMessage.bind(ChatController));

/**
 * @openapi
 * /chat/sessions/{sessionId}/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message (Legacy — sessionId in path)
 *     description: Kept for backward compatibility. Prefer /chat/messages.
 *     security:
 *       - BearerAuth: []
 */
router.post('/sessions/:sessionId/chat', authenticate, ChatController.chat.bind(ChatController));

export default router;
