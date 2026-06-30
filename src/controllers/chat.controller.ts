import { Request, Response, NextFunction } from 'express';
import ChatService from '../services/chat.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/app-error';

export class ChatController {

  // ── POST /api/v1/chat/sessions ─────────────────────────────────────────────
  /**
   * Create a new chat session.
   * Returns ChatSessionResponse only — same as Java (greeting is fire-and-forget, NOT in response).
   */
  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId, contextId } = req.body;
      const uid: string | undefined = req.user?.id;

      if (!characterId || !uid) {
        throw new AppError('Thiếu trường bắt buộc: characterId', 400);
      }

      const session = await ChatService.createSession(String(uid), String(characterId), contextId ? String(contextId) : null);
      sendSuccess(res, session, 'Session created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/v1/chat/history ───────────────────────────────────────────────
  /**
   * Get user's chat history grouped by character.
   * Mirrors Java ChatHistoryServiceImpl.getHistory() → List<ChatHistoryGroupResponse>.
   */
  public async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid: string | undefined = req.user?.id;
      if (!uid) throw new AppError('Không có quyền truy cập', 401);

      const history = await ChatService.getHistory(String(uid));
      sendSuccess(res, history, 'Chat history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/v1/chat/sessions?characterId= ────────────────────────────────
  /**
   * Get sessions filtered by characterId (contextId optional).
   * Mirrors Java ChatSessionServiceImpl.getSessions() → List<ChatSessionResponse>.
   */
  public async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid: string | undefined = req.user?.id;
      if (!uid) throw new AppError('Không có quyền truy cập', 401);

      const characterId = req.query['characterId'];
      const contextId = req.query['contextId'];

      if (!characterId) {
        throw new AppError('Yêu cầu cung cấp characterId', 400);
      }

      const sessions = await ChatService.getSessions(
        String(uid),
        String(characterId),
        contextId ? String(contextId) : undefined
      );
      sendSuccess(res, sessions, 'Sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/v1/chat/sessions/:sessionId/messages ─────────────────────────
  /**
   * Get all messages in a session.
   * Mirrors Java MessageServiceImpl.getMessages() → GetMessagesResponse { messages, suggestedQuestions }.
   */
  public async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId: string = req.params['sessionId'] as string;
      const uid: string | undefined = req.user?.id;
      if (!uid) throw new AppError('Không có quyền truy cập', 401);

      const result = await ChatService.getMessages(sessionId, String(uid));
      sendSuccess(res, result, 'Messages retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/v1/chat/messages ─────────────────────────────────────────────
  /**
   * Send a message and receive an AI response.
   * Mirrors Java MessageServiceImpl.sendMessage() → SendMessageResponse
   * (includes remainingTokens, promptTokens, completionTokens).
   */
  public async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid: string | undefined = req.user?.id;
      const { sessionId, content, messageType } = req.body as {
        sessionId: string;
        content: string;
        messageType?: string;
      };

      if (!sessionId || !content) {
        throw new AppError('Yêu cầu cung cấp sessionId và content', 400);
      }
      if (!uid) throw new AppError('Không có quyền truy cập', 401);

      const result = await ChatService.sendMessage(
        sessionId,
        content,
        String(uid),
        messageType || 'TEXT'
      );

      sendSuccess(res, result, 'Message sent successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/v1/chat/messages/stream ─────────────────────────────────────
  /**
   * Stream an AI response via SSE.
   * Mirrors Java MessageServiceImpl.sendMessageStream().
   */
  public async sendMessageStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid: string | undefined = req.user?.id;
      const { sessionId, content, messageType } = req.body as {
        sessionId: string;
        content: string;
        messageType?: string;
      };

      if (!sessionId || !content) {
        throw new AppError('Yêu cầu cung cấp sessionId và content', 400);
      }
      if (!uid) throw new AppError('Không có quyền truy cập', 401);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Connection', 'keep-alive');

      await ChatService.sendMessageStream(
        sessionId,
        content,
        String(uid),
        messageType || 'TEXT',
        (data: string) => { res.write(data); },
        (remainingTokens: number) => {
          res.write(`data: {"type":"done","remainingTokens":${remainingTokens}}\n\n`);
          res.end();
        },
        (err: any) => {
          console.error('[ChatController] Stream error:', err);
          res.write(`data: {"type":"error","message":"${err.message || 'Stream error'}"}\n\n`);
          res.end();
        }
      );
    } catch (error) {
      next(error);
    }
  }

  // ── DELETE /api/v1/chat/sessions/:sessionId ────────────────────────────────
  /**
   * Hard-delete a session (and its messages).
   * Mirrors Java deleteSession → HTTP 204 No Content.
   */
  public async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid: string | undefined = req.user?.id;
      if (!uid) throw new AppError('Không có quyền truy cập', 401);

      const role: string | undefined = req.user?.role;
      await ChatService.hardDeleteSession(req.params['sessionId'] as string, String(uid), role);
      // HTTP 204 No Content — same as Java
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ── PATCH /api/v1/chat/sessions/:sessionId/soft-delete ────────────────────
  /**
   * Soft-delete a session.
   * Mirrors Java softDeleteSession → HTTP 200 { success: true, data: null }.
   */
  public async softDeleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid: string | undefined = req.user?.id;
      if (!uid) throw new AppError('Không có quyền truy cập', 401);

      await ChatService.softDeleteSession(req.params['sessionId'] as string, String(uid));
      sendSuccess(res, null, 'Session soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new ChatController();
