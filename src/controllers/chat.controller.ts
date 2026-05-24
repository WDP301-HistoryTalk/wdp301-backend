import { Request, Response } from 'express';
import ChatService from '../services/chat.service';

export class ChatController {
  public async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { characterId, contextId } = req.body;
      const uid = req.user?.id;

      if (!characterId || !contextId || !uid) {
        res.status(400).json({ success: false, message: 'Missing required fields: characterId, contextId' });
        return;
      }

      const session = await ChatService.createSession(uid, characterId, contextId);
      res.status(201).json({ success: true, data: session });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getSessionWithMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const data = await ChatService.getSessionMessages(sessionId as string);

      if (!data.session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async chat(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;

      if (!message) {
        res.status(400).json({ success: false, message: 'Message is required' });
        return;
      }

      const aiMessage = await ChatService.processUserMessage(sessionId as string, message);
      res.status(200).json({ success: true, data: aiMessage });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new ChatController();
