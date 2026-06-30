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

// ─── Shared schema definitions ─────────────────────────────────────────────────
/**
 * @openapi
 * components:
 *   schemas:
 *     MessageResponse:
 *       type: object
 *       description: A single chat message (mirrors Java MessageResponse DTO)
 *       properties:
 *         id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *         sessionId:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d2"
 *         role:
 *           type: string
 *           enum: [USER, ASSISTANT]
 *           example: "ASSISTANT"
 *         content:
 *           type: string
 *           example: "Xin chào! Ta là Nguyễn Du..."
 *         messageType:
 *           type: string
 *           enum: [TEXT, VOICE]
 *           example: "TEXT"
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ChatSessionResponse:
 *       type: object
 *       description: A chat session summary (mirrors Java ChatSessionResponse DTO)
 *       properties:
 *         id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d3"
 *         characterId:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d4"
 *         contextId:
 *           type: string
 *           nullable: true
 *           example: "64f1a2b3c4d5e6f7a8b9c0d5"
 *         title:
 *           type: string
 *           example: "Cuộc trò chuyện với Nguyễn Du"
 *         lastMessage:
 *           type: string
 *           nullable: true
 *           example: "Đoạn trường ai có qua cầu mới hay"
 *         lastMessageAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         messageCount:
 *           type: integer
 *           example: 5
 *
 *     ChatHistorySessionItem:
 *       type: object
 *       description: Session item in history list with enriched character/context metadata
 *       properties:
 *         id:
 *           type: string
 *         characterId:
 *           type: string
 *         characterName:
 *           type: string
 *           example: "Nguyễn Du"
 *         characterTitle:
 *           type: string
 *           nullable: true
 *           example: "Đại thi hào"
 *         characterImage:
 *           type: string
 *           nullable: true
 *           example: "https://cdn.example.com/nguyen-du.jpg"
 *         contextId:
 *           type: string
 *           nullable: true
 *         contextName:
 *           type: string
 *           nullable: true
 *           example: "Thời kỳ Lê mạt Nguyễn sơ"
 *         sessionTitle:
 *           type: string
 *           example: "Hỏi về Truyện Kiều"
 *         lastMessage:
 *           type: string
 *           nullable: true
 *         lastMessageAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         messageCount:
 *           type: integer
 *
 *     ChatHistoryGroupResponse:
 *       type: object
 *       description: Sessions grouped by character (mirrors Java ChatHistoryGroupResponse DTO)
 *       properties:
 *         contextId:
 *           type: string
 *           description: Actually the characterId (field name kept for FE compatibility)
 *         contextName:
 *           type: string
 *           description: Actually the characterName (field name kept for FE compatibility)
 *         sessions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChatHistorySessionItem'
 *
 *     GetMessagesResponse:
 *       type: object
 *       description: Session messages + suggested questions (mirrors Java GetMessagesResponse DTO)
 *       properties:
 *         messages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MessageResponse'
 *         suggestedQuestions:
 *           type: array
 *           items:
 *             type: string
 *           description: Suggested questions from the last ASSISTANT message
 *           example: ["Bạn muốn hỏi về tác phẩm nào?", "Cuộc đời ông thế nào?"]
 *
 *     SendMessageResponse:
 *       type: object
 *       description: Response after sending a message (mirrors Java SendMessageResponse DTO)
 *       properties:
 *         userMessage:
 *           $ref: '#/components/schemas/MessageResponse'
 *         assistantMessage:
 *           $ref: '#/components/schemas/MessageResponse'
 *         suggestedQuestions:
 *           type: array
 *           items:
 *             type: string
 *         remainingTokens:
 *           type: integer
 *           description: User's remaining token balance after this exchange
 *           example: 950
 *         promptTokens:
 *           type: integer
 *           description: Tokens consumed by the user prompt
 *           example: 250
 *         completionTokens:
 *           type: integer
 *           description: Tokens consumed by the AI response
 *           example: 150
 */

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /chat/history:
 *   get:
 *     tags: [Chat]
 *     summary: Get user's chat history grouped by character
 *     description: >
 *       Returns all non-deleted chat sessions of the authenticated user,
 *       grouped by character (mirrors Java ChatHistoryServiceImpl.getHistory()).
 *       Each group includes rich character metadata and per-session stats.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Chat history retrieved successfully" }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatHistoryGroupResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticate, ChatController.getHistory.bind(ChatController));

/**
 * @openapi
 * /chat/sessions:
 *   get:
 *     tags: [Chat]
 *     summary: Get sessions filtered by characterId
 *     description: >
 *       Returns sessions for the authenticated user filtered by characterId.
 *       contextId is an optional additional filter.
 *       Mirrors Java ChatSessionServiceImpl.getSessions() → List<ChatSessionResponse>.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: characterId
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the character
 *       - in: query
 *         name: contextId
 *         required: false
 *         schema: { type: string }
 *         description: Optional MongoDB ObjectId of the historical context
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatSessionResponse'
 *       400:
 *         description: Missing characterId
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authenticate, ChatController.getSessions.bind(ChatController));

/**
 * @openapi
 * /chat/sessions:
 *   post:
 *     tags: [Chat]
 *     summary: Create a new chat session
 *     description: >
 *       Creates a new chat session and asynchronously generates an AI greeting
 *       in the background (fire-and-forget). The greeting is saved to DB but
 *       NOT included in the response body — same behaviour as Java BE.
 *       Returns ChatSessionResponse immediately after session creation.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [characterId]
 *             properties:
 *               characterId:
 *                 type: string
 *                 example: "64f1a2b3c4d5e6f7a8b9c0d4"
 *               contextId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional. Context for the session.
 *                 example: "64f1a2b3c4d5e6f7a8b9c0d5"
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Session created successfully" }
 *                 data:
 *                   $ref: '#/components/schemas/ChatSessionResponse'
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Character or context not found
 */
router.post('/sessions', authenticate, ChatController.createSession.bind(ChatController));

/**
 * @openapi
 * /chat/sessions/{sessionId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get all messages in a session
 *     description: >
 *       Returns all non-deleted messages for the given session, plus
 *       suggestedQuestions from the last ASSISTANT message.
 *       Mirrors Java MessageServiceImpl.getMessages() → GetMessagesResponse.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the chat session
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/GetMessagesResponse'
 *       404:
 *         description: Session not found or does not belong to this user
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions/:sessionId/messages', authenticate, ChatController.getMessages.bind(ChatController));

/**
 * @openapi
 * /chat/sessions/{sessionId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Hard-delete a chat session
 *     description: >
 *       Permanently deletes the session and all its messages.
 *       Returns HTTP 204 No Content — same as Java BE.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Session deleted (no response body)
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/sessions/:sessionId', authenticate, ChatController.deleteSession.bind(ChatController));

/**
 * @openapi
 * /chat/sessions/{sessionId}/soft-delete:
 *   patch:
 *     tags: [Chat]
 *     summary: Soft-delete a chat session
 *     description: >
 *       Marks the session as deleted (sets deletedAt timestamp) without removing it from DB.
 *       Mirrors Java ChatSessionServiceImpl.softDeleteSession().
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session soft-deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Session soft-deleted successfully" }
 *                 data: { nullable: true, example: null }
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/sessions/:sessionId/soft-delete', authenticate, ChatController.softDeleteSession.bind(ChatController));

/**
 * @openapi
 * /chat/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message and receive an AI response
 *     description: >
 *       Primary chat endpoint. Sends a user message, calls the AI service,
 *       saves both messages to DB, and returns SendMessageResponse.
 *       Includes token usage fields (remainingTokens, promptTokens, completionTokens)
 *       — same as Java BE.
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
 *               sessionId:
 *                 type: string
 *                 example: "64f1a2b3c4d5e6f7a8b9c0d3"
 *               content:
 *                 type: string
 *                 maxLength: 4000
 *                 example: "Ông có thể kể về Truyện Kiều không?"
 *               messageType:
 *                 type: string
 *                 enum: [TEXT, VOICE]
 *                 default: TEXT
 *                 description: VOICE skips suggested questions to save tokens
 *     responses:
 *       201:
 *         description: Message sent and AI responded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Message sent successfully" }
 *                 data:
 *                   $ref: '#/components/schemas/SendMessageResponse'
 *       400:
 *         description: Missing fields or out of tokens
 *       404:
 *         description: Session not found
 *       502:
 *         description: AI service unavailable
 */
router.post('/messages', authenticate, ChatController.sendMessage.bind(ChatController));

/**
 * @openapi
 * /chat/messages/stream:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message and stream the AI response (SSE)
 *     description: >
 *       Streaming chat endpoint. Response is a Server-Sent Events (SSE) stream.
 *
 *       SSE event types:
 *       - `text`: `{ "type": "text", "data": "<chunk>" }`
 *       - `metadata`: `{ "type": "metadata", "data": { "promptTokens": N, "completionTokens": N, "suggestedQuestions": [...] } }`
 *       - `done`: `{ "type": "done", "remainingTokens": N }` — stream ends here
 *       - `error`: `{ "type": "error", "message": "..." }`
 *
 *       Mirrors Java MessageServiceImpl.sendMessageStream().
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
 *               sessionId:
 *                 type: string
 *                 example: "64f1a2b3c4d5e6f7a8b9c0d3"
 *               content:
 *                 type: string
 *                 example: "Kể về Truyện Kiều"
 *               messageType:
 *                 type: string
 *                 enum: [TEXT, VOICE]
 *                 default: TEXT
 *     responses:
 *       200:
 *         description: SSE stream of the AI response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Missing fields or out of tokens
 *       404:
 *         description: Session not found
 */
router.post('/messages/stream', authenticate, ChatController.sendMessageStream.bind(ChatController));

export default router;
