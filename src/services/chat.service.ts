import axios from 'axios';
import mongoose from 'mongoose';
import ChatSession, { IChatSession } from '../models/chat-session.model';
import Message, { IMessage } from '../models/message.model';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import { MessageRole } from '../types/enums';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

export class ChatService {
  public async createSession(uid: string, characterId: string, contextId: string): Promise<IChatSession> {
    const session = new ChatSession({
      uid: new mongoose.Types.ObjectId(uid),
      characterId: new mongoose.Types.ObjectId(characterId),
      contextId: new mongoose.Types.ObjectId(contextId),
      isActive: true,
    });
    return await session.save();
  }

  public async getSessionMessages(sessionId: string): Promise<{ session: IChatSession | null, messages: IMessage[] }> {
    const session = await ChatSession.findById(sessionId);
    const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
    return { session, messages };
  }

  public async processUserMessage(sessionId: string, userMessage: string): Promise<IMessage> {
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    // 1. Save user message to DB
    const userMsg = new Message({
      sessionId: session._id,
      role: MessageRole.User,
      isFromAi: false,
      content: userMessage,
    });
    await userMsg.save();

    // 2. Query Character and HistoricalContext
    const character = await Character.findById(session.characterId);
    const context = await HistoricalContext.findById(session.contextId);

    if (!character || !context) {
      throw new Error('Character or Context not found');
    }

    // 3. Get 5 latest messages (including the one just saved)
    const messageHistoryDocs = await Message.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Sort back to ASC for AI context
    messageHistoryDocs.reverse();

    const messageHistory = messageHistoryDocs.map((msg) => ({
      role: msg.isFromAi ? 'ai' : 'user',
      content: msg.content,
    }));

    // 4. Call External AI API
    const payload = {
      characterId: character._id.toString(),
      contextId: context._id.toString(),
      userMessage,
      messageHistory,
      characterData: {
        name: character.name,
        background: character.background || '',
        systemPrompt: character.personality || '',
      },
      contextData: {
        name: context.name,
        description: context.description || '',
      },
    };

    let aiResponse;
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/v1/ai/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000, // 30s timeout
      });
      aiResponse = response.data;
    } catch (error: any) {
      console.error('Error calling AI Service:', error.message);
      throw new Error('Failed to communicate with AI Service');
    }

    // 5. Save AI message to DB
    const aiMsg = new Message({
      sessionId: session._id,
      role: MessageRole.Assistant,
      isFromAi: true,
      content: aiResponse.message || aiResponse.response || aiResponse.content || 'No response', // Adapt based on actual AI response format if needed
      suggestedQuestion: aiResponse.suggestedQuestions || [],
    });
    await aiMsg.save();

    // Update session lastMessageAt
    session.lastMessageAt = new Date();
    await session.save();

    return aiMsg;
  }
}

export default new ChatService();
