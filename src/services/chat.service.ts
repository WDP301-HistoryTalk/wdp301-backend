import axios from 'axios';
import mongoose from 'mongoose';
import ChatSession, { IChatSession } from '../models/chat-session.model';
import Message, { IMessage } from '../models/message.model';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import User from '../models/user.model';
import { AppError } from '../utils/app-error';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build CharacterPayload for the AI Service.
 * Mirrors AiServiceClient.buildCharacterPayload() in Java BE.
 */
function buildCharacterPayload(character: any) {
  const fmtDate = (year?: number, month?: number, day?: number, isBC?: boolean): string => {
    if (!year) return '';
    const parts = [day, month, year].filter(Boolean).join('/');
    return isBC ? `${parts} TCN` : parts;
  };

  return {
    characterId: character.characterId || character._id.toString(),
    name: character.name,
    title: character.title || '',
    background: character.background || '',
    personality: character.personality || '',
    born: fmtDate(character.bornYear, character.bornMonth, character.bornDay, character.isBornBc),
    death: fmtDate(character.deathYear, character.deathMonth, character.deathDay, character.isDeathBc),
  };
}

/**
 * Build ContextPayload for the AI Service.
 * Mirrors AiServiceClient.buildContextPayload() in Java BE.
 */
function buildContextPayload(context: any) {
  return {
    contextId: context.contextId || context._id.toString(),
    name: context.name,
    description: context.description || '',
    era: context.era || '',
    location: context.location || '',
    year: context.year ? String(context.year) : '',
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ChatService {

  /**
   * Create a new chat session and generate the AI greeting message.
   * Mirrors ChatSessionServiceImpl.createSession() in Java BE.
   */
  public async createSession(uid: string, characterId: string, contextId: string): Promise<{
    session: IChatSession;
    greetingMessage: IMessage | null;
    suggestedQuestions: string[];
  }> {
    // Look up character and context (by custom ID or _id)
    const character = await Character.findOne({
      $or: [
        { characterId },
        ...(mongoose.isValidObjectId(characterId) ? [{ _id: characterId }] : []),
      ],
      deletedAt: { $exists: false },
    });
    if (!character) throw new AppError('Character not found', 404);

    const context = await HistoricalContext.findOne({
      $or: [
        { contextId },
        ...(mongoose.isValidObjectId(contextId) ? [{ _id: contextId }] : []),
      ],
      deletedAt: { $exists: false },
    });
    if (!context) throw new AppError('Historical context not found', 404);

    const session = await ChatSession.create({
      uid: new mongoose.Types.ObjectId(uid),
      characterId: character._id,
      contextId: context._id,
      isActive: true,
    });

    // Generate AI greeting (mirrors Java createSession greeting call)
    let greetingMessage: IMessage | null = null;
    let suggestedQuestions: string[] = [];

    try {
      const payload = {
        characterId: character.characterId || character._id.toString(),
        contextId: context.contextId || context._id.toString(),
        userMessage: `Hãy chào người dùng bằng cách nhập vai là ${character.name} trong bối cảnh ${context.name}. Hãy giới thiệu bản thân ngắn gọn.`,
        messageHistory: [],
        characterData: buildCharacterPayload(character),
        contextData: buildContextPayload(context),
      };

      const aiRes = await axios.post(`${AI_SERVICE_URL}/v1/ai/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });

      const data = aiRes.data?.data || aiRes.data;
      const greetingContent = data?.message || data?.response || data?.content || '';
      suggestedQuestions = data?.suggestedQuestions || [];

      if (greetingContent) {
        greetingMessage = await Message.create({
          sessionId: session._id,
          isFromAi: true,
          content: greetingContent,
          suggestedQuestions: suggestedQuestions,
        });
      }
    } catch (err: any) {
      console.warn('[ChatService] Failed to generate greeting:', err.message);
    }

    return { session, greetingMessage, suggestedQuestions };
  }

  public async getSessionMessages(sessionId: string, uid?: string): Promise<{
    session: IChatSession | null;
    messages: IMessage[];
  }> {
    const filter: any = { _id: sessionId };
    if (uid) filter.uid = new mongoose.Types.ObjectId(uid);

    const session = await ChatSession.findOne(filter);
    if (!session) throw new AppError('Chat session not found', 404);

    const messages = await Message.find({ sessionId: session._id }).sort({ createdAt: 1 });
    return { session, messages };
  }

  public async getUserSessions(uid: string): Promise<IChatSession[]> {
    return ChatSession.find({
      uid: new mongoose.Types.ObjectId(uid),
      deletedAt: { $exists: false },
    }).sort({ lastMessageAt: -1, updatedAt: -1 });
  }

  /**
   * Send a user message and get AI response.
   * Supports both:
   *   - Java-style: POST /chat/messages { sessionId, content }
   *   - Old style:  POST /chat/sessions/:sessionId/chat { message }
   */
  public async sendMessage(sessionId: string, userMessageText: string, uid: string): Promise<{
    userMessage: IMessage;
    assistantMessage: IMessage;
    suggestedQuestions: string[];
  }> {
    const session = await ChatSession.findOne({
      _id: sessionId,
      uid: new mongoose.Types.ObjectId(uid),
    });
    if (!session) throw new AppError('Chat session not found', 404);

    const user = await User.findById(uid);
    if (!user) throw new AppError('User not found', 404);
    if (user.token <= 0) throw new AppError('Bạn đã hết token. Vui lòng nạp thêm để tiếp tục chat.', 400);

    // 1. Save user message
    const userMsg = await Message.create({
      sessionId: session._id,
      isFromAi: false,
      content: userMessageText,
    });

    // 2. Fetch character + context
    const character = await Character.findById(session.characterId);
    const context = await HistoricalContext.findById(session.contextId);
    if (!character || !context) throw new AppError('Character or Context not found', 404);

    // 3. Build message history (latest 10, ascending)
    const historyDocs = await Message.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .limit(10);
    historyDocs.reverse();

    const messageHistory = historyDocs.map((m) => ({
      role: m.isFromAi ? 'assistant' : 'user',
      content: m.content,
    }));

    // 4. Call AI Service
    const payload = {
      characterId: character.characterId || character._id.toString(),
      contextId: context.contextId || context._id.toString(),
      userMessage: userMessageText,
      messageHistory,
      characterData: buildCharacterPayload(character),
      contextData: buildContextPayload(context),
    };

    let assistantContent = 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.';
    let suggestedQuestions: string[] = [];
    let promptToken = 0;
    let completionToken = 0;
    let totalToken = 0;

    try {
      const aiRes = await axios.post(`${AI_SERVICE_URL}/v1/ai/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });
      const data = aiRes.data?.data || aiRes.data;
      assistantContent = data?.message || data?.response || data?.content || assistantContent;
      suggestedQuestions = data?.suggestedQuestions || [];
      if (data?.tokenUsage) {
        promptToken = data.tokenUsage.promptTokens || 0;
        completionToken = data.tokenUsage.completionTokens || 0;
        totalToken = data.tokenUsage.totalTokens || 0;
      }
    } catch (err: any) {
      console.error('[ChatService] AI call failed:', err.message);
      throw new AppError('Failed to communicate with AI Service', 502);
    }

    // Deduct tokens
    if (totalToken > 0) {
      user.token = Math.max(0, user.token - totalToken);
      await user.save();
    }

    // Update userMsg with prompt tokens (optional, if schema supports it)
    userMsg.token = promptToken;
    await userMsg.save();

    // 5. Save AI message
    const aiMsg = await Message.create({
      sessionId: session._id,
      isFromAi: true,
      content: assistantContent,
      suggestedQuestions: suggestedQuestions,
      token: completionToken,
    });

    // 6. Update session
    session.lastMessageAt = new Date();
    await session.save();

    // 7. Async title generation (fire-and-forget, only on first real exchange)
    const msgCount = await Message.countDocuments({ sessionId: session._id });
    if (msgCount <= 3 && !session.title) {
      setImmediate(() => this.generateTitleAsync(session, character, context, userMessageText, assistantContent));
    }

    return { userMessage: userMsg, assistantMessage: aiMsg, suggestedQuestions };
  }

  private async generateTitleAsync(
    session: IChatSession,
    character: any,
    context: any,
    firstUserMsg: string,
    firstAiMsg: string
  ): Promise<void> {
    try {
      const payload = {
        characterId: character.characterId || character._id.toString(),
        contextId: context.contextId || context._id.toString(),
        firstUserMessage: firstUserMsg,
        firstAssistantMessage: firstAiMsg,
        characterData: buildCharacterPayload(character),
        contextData: buildContextPayload(context),
      };
      const res = await axios.post(`${AI_SERVICE_URL}/v1/ai/generate-title`, payload, { timeout: 30000 });
      const title = res.data?.data?.title || res.data?.title;
      if (title) {
        await ChatSession.findByIdAndUpdate(session._id, { $set: { title } });
      }
    } catch (err: any) {
      console.warn('[ChatService] Title generation failed:', err.message);
    }
  }

  public async deleteSession(sessionId: string, uid: string): Promise<void> {
    const session = await ChatSession.findOneAndUpdate(
      { _id: sessionId, uid: new mongoose.Types.ObjectId(uid) },
      { $set: { deletedAt: new Date(), isActive: false } },
      { new: true }
    );
    if (!session) throw new AppError('Chat session not found', 404);
  }
}

export default new ChatService();
