import { Request, Response } from 'express';
import ChatService from '../services/chat.service';

export class ChatController {

  /**
   * POST /api/v1/chat/sessions
   * Create session + AI greeting (mirrors Java BE)
   */
  public async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { characterId, contextId } = req.body;
      const uid = req.user?.id;

      if (!characterId || !contextId || !uid) {
        res.status(400).json({ success: false, message: 'Missing required fields: characterId, contextId' });
        return;
      }

      const { session, greetingMessage, suggestedQuestions } = await ChatService.createSession(uid as string, characterId as string, contextId as string);

      res.status(201).json({
        success: true,
        message: 'Chat session created successfully',
        data: {
          session,
          greetingMessage: greetingMessage
            ? {
                id: (greetingMessage as any)._id,
                sessionId: session._id,
                role: 'ASSISTANT',
                content: greetingMessage.content,
                createdAt: greetingMessage.createdAt,
              }
            : null,
          suggestedQuestions,
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/chat/sessions/:sessionId/messages
   */
  public async getSessionWithMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const uid = req.user?.id;

      const { session, messages } = await ChatService.getSessionMessages(sessionId as string, uid as string);

      const mappedMessages = messages.map((msg) => {
        const obj = msg.toObject ? msg.toObject() : msg;
        return {
          ...obj,
          id: obj._id,
          role: obj.isFromAi ? 'ASSISTANT' : 'USER',
          suggestedQuestions: obj.suggestedQuestion || [],
        };
      });

      res.status(200).json({ success: true, data: { session, messages: mappedMessages } });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/chat/history
   * User's own session list (sidebar, like ChatGPT)
   */
  public async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const uid = req.user?.id;
      if (!uid) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const sessions = await ChatService.getUserSessions(uid);
      res.status(200).json({ success: true, message: 'Chat history retrieved successfully', data: sessions });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/chat/sessions?contextId=&characterId=
   */
  public async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const uid = req.user?.id;
      const { contextId, characterId } = req.query;
      if (!uid) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      if (!contextId || !characterId) {
        res.status(400).json({ success: false, message: 'contextId and characterId are required' });
        return;
      }

      const sessions = await ChatService.getSessionsFiltered(uid, contextId as string, characterId as string);
      res.status(200).json({ success: true, message: 'Sessions retrieved successfully', data: sessions });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/chat/messages   ← Java-style: sessionId in body
   */
  public async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const uid = req.user?.id;
      const { sessionId, content } = req.body;

      if (!sessionId || !content) {
        res.status(400).json({ success: false, message: 'sessionId and content are required' });
        return;
      }
      if (!uid) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { userMessage, assistantMessage, suggestedQuestions } = await ChatService.sendMessage(sessionId as string, content as string, uid as string);

      const mapMsg = (msg: any, isAi: boolean) => ({
        id: msg._id,
        sessionId: msg.sessionId,
        role: isAi ? 'ASSISTANT' : 'USER',
        content: msg.content,
        createdAt: msg.createdAt,
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          userMessage: mapMsg(userMessage, false),
          assistantMessage: mapMsg(assistantMessage, true),
          suggestedQuestions,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/chat/sessions/:sessionId/chat   ← Legacy style kept for backward compat
   */
  public async chat(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { message, content } = req.body;
      const uid = req.user?.id;
      const msgText = content || message;

      if (!msgText) {
        res.status(400).json({ success: false, message: 'message or content is required' });
        return;
      }
      if (!uid) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { userMessage, assistantMessage, suggestedQuestions } = await ChatService.sendMessage(sessionId as string, msgText as string, uid as string);

      res.status(200).json({
        success: true,
        data: {
          userMessage: { id: userMessage._id, role: 'USER', content: userMessage.content },
          assistantMessage: { id: assistantMessage._id, role: 'ASSISTANT', content: assistantMessage.content },
          suggestedQuestions,
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/v1/chat/sessions/:sessionId
   */
  public async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const uid = req.user?.id;
      if (!uid) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      await ChatService.deleteSession(req.params.sessionId as string, uid as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  /**
   * PATCH /api/v1/chat/sessions/:sessionId/soft-delete
   */
  public async softDeleteSession(req: Request, res: Response): Promise<void> {
    try {
      const uid = req.user?.id;
      if (!uid) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      await ChatService.deleteSession(req.params.sessionId as string, uid as string);
      res.status(200).json({ success: true, message: 'Session soft-deleted successfully', data: null });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}

export default new ChatController();
