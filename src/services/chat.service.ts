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

  let enhancedBackground = character.background || '';
  const contexts: any[] = [];

  if (character.contextIds && character.contextIds.length > 0) {
    enhancedBackground += "\n\nCác sự kiện/bối cảnh lịch sử đã tham gia:\n";
    for (const ctx of character.contextIds) {
      if (ctx.name) { // Ensure populated
        enhancedBackground += `- ${ctx.name}: ${ctx.description || ''}\n`;
        contexts.push({ contextId: ctx._id.toString(), name: ctx.name });
      }
    }
  }

  return {
    characterId: character._id.toString(),
    name: character.name,
    title: character.title || '',
    background: enhancedBackground,
    personality: character.personality || '',
    born: fmtDate(character.bornYear, character.bornMonth, character.bornDay, character.isBornBc),
    death: fmtDate(character.deathYear, character.deathMonth, character.deathDay, character.isDeathBc),
    contexts: contexts.length > 0 ? contexts : undefined
  };
}

/**
 * Build ContextPayload for the AI Service.
 * Mirrors AiServiceClient.buildContextPayload() in Java BE.
 */
function buildContextPayload(context: any) {
  return {
    contextId: context._id.toString(),
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
    }).populate('contextIds');
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    const context = await HistoricalContext.findOne({
      $or: [
        { contextId },
        ...(mongoose.isValidObjectId(contextId) ? [{ _id: contextId }] : []),
      ],
      deletedAt: { $exists: false },
    });
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

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
        characterId: character._id.toString(),
        contextId: context._id.toString(),
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
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);

    const messages = await Message.find({ sessionId: session._id }).sort({ createdAt: 1 });
    return { session, messages };
  }

  public async getUserSessions(uid: string): Promise<IChatSession[]> {
    return ChatSession.find({
      uid: new mongoose.Types.ObjectId(uid),
      deletedAt: { $exists: false },
    }).sort({ lastMessageAt: -1, updatedAt: -1 });
  }

  public async getSessionsFiltered(uid: string, contextId: string, characterId: string): Promise<IChatSession[]> {
    const filter: any = {
      uid: new mongoose.Types.ObjectId(uid),
      deletedAt: { $exists: false },
    };
    if (mongoose.isValidObjectId(contextId)) filter.contextId = new mongoose.Types.ObjectId(contextId);
    if (mongoose.isValidObjectId(characterId)) filter.characterId = new mongoose.Types.ObjectId(characterId);

    return ChatSession.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 });
  }

  /**
   * Send a user message and get AI response.
   * Supports both:
   *   - Java-style: POST /chat/messages { sessionId, content }
   *   - Old style:  POST /chat/sessions/:sessionId/chat { message }
   */
  public async sendMessage(sessionId: string, userMessageText: string, uid: string, messageType: string = 'TEXT'): Promise<{
    userMessage: IMessage;
    assistantMessage: IMessage;
    suggestedQuestions: string[];
  }> {
    const session = await ChatSession.findOne({
      _id: sessionId,
      uid: new mongoose.Types.ObjectId(uid),
    });
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);

    const user = await User.findById(uid);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    const isCustomer = user.role === 'CUSTOMER';
    if (isCustomer && user.token <= 0) throw new AppError('Bạn đã hết token. Vui lòng nạp thêm để tiếp tục chat.', 400);

    // 1. Save user message
    const userMsg = await Message.create({
      sessionId: session._id,
      isFromAi: false,
      content: userMessageText,
      messageType: messageType || 'TEXT',
    });

    // 2. Fetch character + context
    const character = await Character.findById(session.characterId).populate('contextIds');
    const context = await HistoricalContext.findById(session.contextId);
    if (!character || !context) throw new AppError('Không tìm thấy nhân vật hoặc bối cảnh lịch sử', 404);

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
      characterId: character._id.toString(),
      contextId: context._id.toString(),
      userMessage: userMessageText,
      messageHistory,
      characterData: buildCharacterPayload(character),
      contextData: buildContextPayload(context),
      skipSuggestions: messageType.toUpperCase() === 'VOICE',
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
      throw new AppError('Lỗi giao tiếp với AI Service', 502);
    }

    // Deduct tokens
    if (isCustomer && totalToken > 0) {
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
      messageType: messageType || 'TEXT',
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
        characterId: character._id.toString(),
        contextId: context._id.toString(),
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
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);
  }

  public async hardDeleteSession(sessionId: string, uid: string): Promise<void> {
    const session = await ChatSession.findOneAndDelete({
      _id: sessionId,
      uid: new mongoose.Types.ObjectId(uid),
    });
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);
    await Message.deleteMany({ sessionId: session._id });
  }

  public async sendMessageStream(
    sessionId: string,
    userMessageText: string,
    uid: string,
    messageType: string = 'TEXT',
    onData: (data: string) => void,
    onComplete: (remainingTokens: number) => void,
    onError: (err: any) => void
  ): Promise<void> {
    try {
      const session = await ChatSession.findOne({
        _id: sessionId,
        uid: new mongoose.Types.ObjectId(uid),
      });
      if (!session) throw new AppError('Không tìm thấy phiên chat', 404);

      const user = await User.findById(uid);
      if (!user) throw new AppError('Không tìm thấy người dùng', 404);
      const isCustomer = user.role === 'CUSTOMER';
      if (isCustomer && user.token <= 0) throw new AppError('Bạn đã hết token. Vui lòng nạp thêm để tiếp tục chat.', 400);

      const userMsg = await Message.create({
        sessionId: session._id,
        isFromAi: false,
        content: userMessageText,
        messageType: messageType || 'TEXT'
      });

      const character = await Character.findById(session.characterId).populate('contextIds');
      const context = await HistoricalContext.findById(session.contextId);
      if (!character || !context) throw new AppError('Không tìm thấy nhân vật hoặc bối cảnh lịch sử', 404);

      const historyDocs = await Message.find({ sessionId: session._id })
        .sort({ createdAt: -1 })
        .limit(5); 
      historyDocs.reverse();

      const messageHistory = historyDocs.slice(0, -1).map((m) => ({
        role: m.isFromAi ? 'assistant' : 'user',
        content: m.content,
      }));

      const skipSuggestions = messageType.toUpperCase() === 'VOICE';

      const payload = {
        characterId: character._id.toString(),
        contextId: context._id.toString(),
        userMessage: userMessageText,
        messageHistory,
        characterData: buildCharacterPayload(character),
        contextData: buildContextPayload(context),
        skipSuggestions
      };

      let fullMessage = '';
      let promptToken = 0;
      let completionToken = 0;
      let suggestedQuestions: string[] = [];

      const response = await axios.post(`${AI_SERVICE_URL}/v1/ai/chat/stream`, payload, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream',
        timeout: 180000
      });

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            try {
              const node = JSON.parse(jsonStr);
              if (node.type === 'text') {
                fullMessage += node.data;
                onData(line + '\n\n');
              } else if (node.type === 'metadata') {
                promptToken = node.data.promptTokens || 0;
                completionToken = node.data.completionTokens || 0;
                suggestedQuestions = node.data.suggestedQuestions || [];
                onData(line + '\n\n');
              } else if (node.type === 'error') {
                onData(line + '\n\n');
              }
            } catch (err) {
              console.warn('Error parsing SSE chunk:', err);
            }
          }
        }
      });

      response.data.on('end', async () => {
        try {
          userMsg.token = promptToken;
          await userMsg.save();

          await Message.create({
            sessionId: session._id,
            isFromAi: true,
            content: fullMessage,
            suggestedQuestions: suggestedQuestions,
            token: completionToken,
            messageType: messageType || 'TEXT'
          });

          const totalToken = promptToken + completionToken;
          let remainingTokens = user.token || 0;
          if (isCustomer && totalToken > 0) {
            remainingTokens = Math.max(0, remainingTokens - totalToken);
            user.token = remainingTokens;
            await user.save();
          }

          session.lastMessageAt = new Date();
          await session.save();

          const msgCount = await Message.countDocuments({ sessionId: session._id });
          if (msgCount <= 3 && !session.title) {
            setImmediate(() => this.generateTitleAsync(session, character, context, userMessageText, fullMessage));
          }

          onComplete(remainingTokens);
        } catch (err) {
          onError(err);
        }
      });

      response.data.on('error', (err: any) => {
        onError(err);
      });

    } catch (err: any) {
      onError(err);
    }
  }
}

export default new ChatService();
