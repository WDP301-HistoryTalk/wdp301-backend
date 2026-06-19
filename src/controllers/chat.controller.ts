import { Request, Response, NextFunction } from 'express';
import ChatService from '../services/chat.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/app-error';

export class ChatController {

  /**
   * POST /api/v1/chat/sessions
   * Create session + AI greeting (mirrors Java BE)
   */
  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId, contextId } = req.body;
      const uid = req.user?.id;

      if (!characterId || !contextId || !uid) {
        throw new AppError('Thiếu các trường bắt buộc: characterId, contextId', 400);
      }

      const { session, greetingMessage, suggestedQuestions } = await ChatService.createSession(uid as string, characterId as string, contextId as string);

      const data = {
        session,
        greetingMessage: greetingMessage
          ? {
              id: (greetingMessage as any).id || (greetingMessage as any)._id,
              sessionId: (session as any).id || session._id,
              role: 'ASSISTANT',
              content: greetingMessage.content,
              createdAt: greetingMessage.createdAt,
            }
          : null,
        suggestedQuestions,
      };

      sendSuccess(res, data, 'Chat session created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/sessions/:sessionId/messages
   */
  public async getSessionWithMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const uid = req.user?.id;

      const { session, messages } = await ChatService.getSessionMessages(sessionId as string, uid as string);

      const mappedMessages = messages.map((msg) => {
        const obj = msg.toObject ? msg.toObject() : msg;
        return {
          ...obj,
          id: obj.id || obj._id,
          role: obj.isFromAi ? 'ASSISTANT' : 'USER',
          messageType: obj.messageType || 'TEXT',
          suggestedQuestions: obj.suggestedQuestion || [],
        };
      });

      sendSuccess(res, { session, messages: mappedMessages }, 'Session messages retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/history
   * User's own session list (sidebar, like ChatGPT)
   */
  public async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.id;
      if (!uid) { throw new AppError('Không có quyền truy cập', 401); }

      const sessions = await ChatService.getUserSessions(uid);
      sendSuccess(res, sessions, 'Chat history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/sessions?contextId=&characterId=
   */
  public async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.id;
      const { contextId, characterId } = req.query;
      if (!uid) { throw new AppError('Không có quyền truy cập', 401); }

      if (!contextId || !characterId) {
        throw new AppError('Yêu cầu cung cấp contextId và characterId', 400);
      }

      const sessions = await ChatService.getSessionsFiltered(uid, contextId as string, characterId as string);
      sendSuccess(res, sessions, 'Sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/messages   ← Java-style: sessionId in body
   */
  public async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.id;
      const { sessionId, content, messageType } = req.body;

      if (!sessionId || !content) {
        throw new AppError('Yêu cầu cung cấp sessionId và content', 400);
      }
      if (!uid) { throw new AppError('Không có quyền truy cập', 401); }

      const { userMessage, assistantMessage, suggestedQuestions } = await ChatService.sendMessage(sessionId as string, content as string, uid as string, messageType as string);

      const mapMsg = (msg: any, isAi: boolean) => ({
        id: msg.id || msg._id,
        sessionId: msg.sessionId,
        role: isAi ? 'ASSISTANT' : 'USER',
        content: msg.content,
        messageType: msg.messageType || 'TEXT',
        createdAt: msg.createdAt,
      });

      const data = {
        userMessage: mapMsg(userMessage, false),
        assistantMessage: mapMsg(assistantMessage, true),
        suggestedQuestions,
      };

      sendSuccess(res, data, 'Message sent successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/messages/stream
   * Stream response for SSE
   */
  public async sendMessageStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.id;
      const { sessionId, content, messageType } = req.body;

      if (!sessionId || !content) {
        throw new AppError('Yêu cầu cung cấp sessionId và content', 400);
      }
      if (!uid) { throw new AppError('Không có quyền truy cập', 401); }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Connection', 'keep-alive');

      await ChatService.sendMessageStream(
        sessionId as string,
        content as string,
        uid as string,
        messageType as string,
        (data: string) => {
          res.write(data);
        },
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

  /**
   * POST /api/v1/chat/sessions/:sessionId/chat   ← Legacy style kept for backward compat
   */
  public async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { message, content } = req.body;
      const uid = req.user?.id;
      const msgText = content || message;

      if (!msgText) {
        throw new AppError('Yêu cầu cung cấp message hoặc content', 400);
      }
      if (!uid) { throw new AppError('Không có quyền truy cập', 401); }

      const { userMessage, assistantMessage, suggestedQuestions } = await ChatService.sendMessage(sessionId as string, msgText as string, uid as string);

      const data = {
        userMessage: { id: (userMessage as any).id || userMessage._id, role: 'USER', content: userMessage.content },
        assistantMessage: { id: (assistantMessage as any).id || assistantMessage._id, role: 'ASSISTANT', content: assistantMessage.content },
        suggestedQuestions,
      };

      sendSuccess(res, data, 'Chat successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/chat/sessions/:sessionId
   */
  public async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.id;
      if (!uid) { throw new AppError('Không có quyền truy cập', 401); }

      await ChatService.hardDeleteSession(req.params.sessionId as string, uid as string);
      sendSuccess(res, null, 'Session deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/chat/sessions/:sessionId/soft-delete
   */
  public async softDeleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user?.id;
      if (!uid) { throw new AppError('Không có quyền truy cập', 401); }

      await ChatService.deleteSession(req.params.sessionId as string, uid as string);
      sendSuccess(res, null, 'Session soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new ChatController();
