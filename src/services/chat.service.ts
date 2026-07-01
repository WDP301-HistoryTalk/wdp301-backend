import axios from 'axios';
import mongoose from 'mongoose';
import ChatSession, { IChatSession } from '../models/chat-session.model';
import Message, { IMessage } from '../models/message.model';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import User from '../models/user.model';
import { AppError } from '../utils/app-error';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// ─── Response shape types (mirrors Java DTOs) ────────────────────────────────

export interface MessageResponse {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  messageType: string;
  createdAt: Date;
}

export interface ChatSessionResponse {
  id: string;
  characterId: string;
  contextId: string | null;
  title: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  messageCount: number;
}

export interface ChatHistorySessionItem {
  id: string;
  characterId: string;
  characterName: string;
  characterTitle: string | null;
  characterImage: string | null;
  contextId: string | null;
  contextName: string | null;
  sessionTitle: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  messageCount: number;
}

export interface ChatHistoryGroupResponse {
  contextId: string;       // actually characterId — kept to match Java field name
  contextName: string;     // actually characterName — kept to match Java field name
  sessions: ChatHistorySessionItem[];
}

export interface GetMessagesResponse {
  messages: MessageResponse[];
  suggestedQuestions: string[];
}

export interface SendMessageResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
  suggestedQuestions: string[];
  remainingTokens: number;
  promptTokens: number;
  completionTokens: number;
}

export interface CreateSessionResponse {
  id: string;
  characterId: string;
  contextId: string | null;
  title: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  messageCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a raw Message document → MessageResponse DTO (mirrors Java mapToMessageResponse).
 */
function mapToMessageResponse(msg: IMessage): MessageResponse {
  return {
    id: (msg as any)._id.toString(),
    sessionId: msg.sessionId.toString(),
    role: msg.isFromAi ? 'ASSISTANT' : 'USER',
    content: msg.content,
    messageType: msg.messageType || 'TEXT',
    createdAt: msg.createdAt,
  };
}

/**
 * Map a populated ChatSession → ChatSessionResponse DTO (mirrors Java mapToResponse).
 */
function mapSessionToResponse(
  session: IChatSession,
  lastMessage: string | null,
  messageCount: number
): ChatSessionResponse {
  return {
    id: (session as any)._id.toString(),
    characterId: session.characterId.toString(),
    contextId: session.contextId ? session.contextId.toString() : null,
    title: (session as any).title || '',
    lastMessage,
    lastMessageAt: (session as any).lastMessageAt ?? null,
    messageCount,
  };
}

/**
 * Build CharacterPayload for the AI Service.
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
      if (ctx.name) {
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
    contexts: contexts.length > 0 ? contexts : undefined,
  };
}

/**
 * Build ContextPayload for the AI Service.
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

  // ── GET /chat/history ─────────────────────────────────────────────────────

  /**
   * Get all sessions of a user, grouped by character.
   * Mirrors Java ChatHistoryServiceImpl.getHistory().
   */
  public async getHistory(uid: string): Promise<ChatHistoryGroupResponse[]> {
    const sessions = await ChatSession.find({
      uid: new mongoose.Types.ObjectId(uid),
      deletedAt: { $exists: false },
    })
      .populate('characterId')
      .populate('contextId')
      .sort({ lastMessageAt: -1 });

    // Group by characterId
    const grouped = new Map<string, { character: any; sessions: IChatSession[] }>();
    for (const session of sessions) {
      const char = (session as any).characterId as any;
      if (!char || !char._id) continue;
      const charKey = char._id.toString();
      if (!grouped.has(charKey)) {
        grouped.set(charKey, { character: char, sessions: [] });
      }
      grouped.get(charKey)!.sessions.push(session);
    }

    // Build response, sorted by latest lastMessageAt DESC
    const groups: ChatHistoryGroupResponse[] = [];
    for (const [charId, { character, sessions: groupSessions }] of grouped) {
      // Fetch message counts for each session
      const sessionIds = groupSessions.map((s: any) => s._id);
      const counts = await Message.aggregate([
        { $match: { sessionId: { $in: sessionIds }, deletedAt: { $exists: false } } },
        { $group: { _id: '$sessionId', count: { $sum: 1 }, lastContent: { $last: '$content' }, lastAt: { $max: '$createdAt' } } },
      ]);
      const countMap = new Map(counts.map((c) => [c._id.toString(), c]));

      const items: ChatHistorySessionItem[] = groupSessions
        .sort((a: any, b: any) => {
          const ta = a.lastMessageAt?.getTime() ?? 0;
          const tb = b.lastMessageAt?.getTime() ?? 0;
          return tb - ta;
        })
        .map((session: any) => {
          const sid = session._id.toString();
          const stat = countMap.get(sid);
          const ctx = session.contextId as any;
          return {
            id: sid,
            characterId: charId,
            characterName: character.name || '[Deleted Character]',
            characterTitle: character.title ?? null,
            characterImage: character.imageUrl ?? null,
            contextId: ctx?._id?.toString() ?? null,
            contextName: ctx?.name ?? null,
            sessionTitle: session.title || '',
            lastMessage: stat?.lastContent ?? null,
            lastMessageAt: session.lastMessageAt ?? null,
            messageCount: stat?.count ?? 0,
          } as ChatHistorySessionItem;
        });

      // Use characterId as contextId field name (matching Java's "repurposing")
      groups.push({
        contextId: charId,
        contextName: character.name || '[Deleted Character]',
        sessions: items,
      });
    }

    // Sort groups by latest lastMessageAt DESC
    groups.sort((a, b) => {
      const ta = a.sessions[0]?.lastMessageAt?.getTime() ?? 0;
      const tb = b.sessions[0]?.lastMessageAt?.getTime() ?? 0;
      return tb - ta;
    });

    return groups;
  }

  // ── GET /chat/sessions?characterId= ───────────────────────────────────────

  /**
   * Get sessions filtered by characterId (and optionally contextId).
   * Mirrors Java ChatSessionServiceImpl.getSessions().
   * Note: Java only requires characterId; contextId is optional filter.
   */
  public async getSessions(uid: string, characterId: string, contextId?: string): Promise<ChatSessionResponse[]> {
    const filter: any = {
      uid: new mongoose.Types.ObjectId(uid),
      deletedAt: { $exists: false },
    };
    if (mongoose.isValidObjectId(characterId)) {
      filter.characterId = new mongoose.Types.ObjectId(characterId);
    }
    if (contextId && mongoose.isValidObjectId(contextId)) {
      filter.contextId = new mongoose.Types.ObjectId(contextId);
    }

    const sessions = await ChatSession.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 });

    // For each session, get messageCount and lastMessage
    const sessionIds = sessions.map((s: any) => s._id);
    const counts = await Message.aggregate([
      { $match: { sessionId: { $in: sessionIds }, deletedAt: { $exists: false } } },
      { $group: { _id: '$sessionId', count: { $sum: 1 }, lastContent: { $last: '$content' }, lastAt: { $max: '$createdAt' } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c]));

    return sessions.map((session: any) => {
      const stat = countMap.get(session._id.toString());
      return mapSessionToResponse(session, stat?.lastContent ?? null, stat?.count ?? 0);
    });
  }

  // ── POST /chat/sessions ───────────────────────────────────────────────────

  /**
   * Create a new session and generate AI greeting synchronously.
   * Awaits greeting before returning so FE can call GET /messages immediately.
   */
  public async createSession(
    uid: string,
    characterId: string,
    contextId: string | null
  ): Promise<CreateSessionResponse> {
    const character = await Character.findOne({
      $or: [
        ...(mongoose.isValidObjectId(characterId) ? [{ _id: characterId }] : []),
      ],
      deletedAt: { $exists: false },
    }).populate('contextIds');
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    let context = null;
    if (contextId && contextId.trim() !== '') {
      context = await HistoricalContext.findOne({
        $or: [
          ...(mongoose.isValidObjectId(contextId) ? [{ _id: contextId }] : []),
        ],
        deletedAt: { $exists: false },
      });
      // context is optional — if not found, proceed without it (same as Java)
    }

    const session = await ChatSession.create({
      uid: new mongoose.Types.ObjectId(uid),
      characterId: character._id,
      contextId: context ? context._id : undefined,
      title: '',
      isActive: true,
    });

    // Await greeting so it is persisted before we return the session id.
    // This prevents the race condition where FE calls GET /messages before
    // the async greeting has been saved.
    await this.generateGreetingAsync(session, character, context);

    // Count persisted messages (1 if greeting succeeded, 0 if AI failed)
    const messageCount = await Message.countDocuments({
      sessionId: session._id,
      deletedAt: { $exists: false },
    });

    return {
      id: (session as any)._id.toString(),
      characterId: character._id.toString(),
      contextId: context ? context._id.toString() : null,
      title: '',
      lastMessage: null,
      lastMessageAt: messageCount > 0 ? (session as any).lastMessageAt ?? null : null,
      messageCount,
    };
  }

  private async generateGreetingAsync(session: IChatSession, character: any, context: any): Promise<void> {
    try {
      const payload = {
        characterId: character._id.toString(),
        contextId: context ? context._id.toString() : '00000000-0000-0000-0000-000000000000',
        userMessage: `Hãy chào và giới thiệu ngắn gọn về bản thân.`,
        messageHistory: [],
        characterData: buildCharacterPayload(character),
        contextData: context ? buildContextPayload(context) : null,
        skipSuggestions: false,
      };

      const aiRes = await axios.post(`${AI_SERVICE_URL}/v1/ai/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });

      const data = aiRes.data?.data || aiRes.data;
      const greetingContent: string = data?.message || data?.response || data?.content || '';
      const suggestedQuestions: string[] = data?.suggestedQuestions || [];

      if (greetingContent) {
        await Message.create({
          sessionId: session._id,
          isFromAi: true,
          content: greetingContent,
          suggestedQuestions,
          messageType: 'TEXT',
        });

        await ChatSession.findByIdAndUpdate(session._id, { lastMessageAt: new Date() });
      }
    } catch (err: any) {
      console.warn('[ChatService] Failed to generate greeting:', err.message);
    }
  }

  // ── GET /chat/sessions/:id/messages ───────────────────────────────────────

  /**
   * Get all messages in a session + suggestedQuestions from last ASSISTANT message.
   * Mirrors Java MessageServiceImpl.getMessages() → GetMessagesResponse.
   */
  public async getMessages(sessionId: string, uid: string): Promise<GetMessagesResponse> {
    const session = await ChatSession.findOne({
      _id: sessionId,
      uid: new mongoose.Types.ObjectId(uid),
      deletedAt: { $exists: false },
    });
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);

    const messages = await Message.find({
      sessionId: session._id,
      deletedAt: { $exists: false },
    }).sort({ createdAt: 1 });

    const messageResponses = messages.map(mapToMessageResponse);

    // suggestedQuestions from last ASSISTANT message (same as Java)
    const lastAssistant = [...messages].reverse().find((m) => m.isFromAi);
    const suggestedQuestions: string[] = lastAssistant?.suggestedQuestions ?? [];

    return { messages: messageResponses, suggestedQuestions };
  }

  // ── POST /chat/messages ───────────────────────────────────────────────────

  /**
   * Send a user message, call AI, return SendMessageResponse.
   * Mirrors Java MessageServiceImpl.sendMessage() exactly.
   */
  public async sendMessage(
    sessionId: string,
    userMessageText: string,
    uid: string,
    messageType: string = 'TEXT'
  ): Promise<SendMessageResponse> {
    const session = await ChatSession.findOne({
      _id: sessionId,
      uid: new mongoose.Types.ObjectId(uid),
      deletedAt: { $exists: false },
    });
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);

    const user = await User.findById(uid);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    const isCustomer = user.role === 'CUSTOMER';
    if (isCustomer && (user.token ?? 0) <= 0) {
      throw new AppError('Bạn đã hết token. Vui lòng nạp thêm để tiếp tục chat.', 400);
    }

    // Load existing history BEFORE saving new user message (same as Java)
    const existingMessages = await Message.find({
      sessionId: session._id,
      deletedAt: { $exists: false },
    }).sort({ createdAt: 1 });

    const userMessageCount = existingMessages.filter((m) => !m.isFromAi).length;
    const isFirstUserMessage = userMessageCount === 0;

    // Save user message
    const savedUserMsg = await Message.create({
      sessionId: session._id,
      isFromAi: false,
      content: userMessageText,
      messageType: messageType || 'TEXT',
    });

    // Build history for AI (last 4 messages, mirrors Java MAX_HISTORY_MESSAGES = 4)
    const MAX_HISTORY = 4;
    const recentMessages = existingMessages.slice(Math.max(0, existingMessages.length - MAX_HISTORY));
    const messageHistory = recentMessages.map((m) => ({
      role: m.isFromAi ? 'assistant' : 'user',
      content: m.content,
    }));

    const character = await Character.findById(session.characterId).populate('contextIds');
    const context = await HistoricalContext.findById(session.contextId);
    if (!character) throw new AppError('Không tìm thấy nhân vật hoặc bối cảnh lịch sử', 404);

    const skipSuggestions = (messageType || '').toUpperCase() === 'VOICE';

    const payload = {
      characterId: character._id.toString(),
      contextId: context ? context._id.toString() : '00000000-0000-0000-0000-000000000000',
      userMessage: userMessageText,
      messageHistory,
      characterData: buildCharacterPayload(character),
      contextData: context ? buildContextPayload(context) : null,
      skipSuggestions,
    };

    let assistantContent = 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.';
    let suggestedQuestions: string[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    try {
      const aiRes = await axios.post(`${AI_SERVICE_URL}/v1/ai/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });
      const data = aiRes.data?.data || aiRes.data;
      assistantContent = data?.message || data?.response || data?.content || assistantContent;
      suggestedQuestions = data?.suggestedQuestions || [];
      if (data?.tokenUsage) {
        promptTokens = data.tokenUsage.promptTokens || 0;
        completionTokens = data.tokenUsage.completionTokens || 0;
        totalTokens = data.tokenUsage.totalTokens || 0;
      }
    } catch (err: any) {
      console.error('[ChatService] AI call failed:', err.message);
      throw new AppError('Lỗi giao tiếp với AI Service', 502);
    }

    // Save prompt tokens to user message
    savedUserMsg.token = promptTokens;
    await savedUserMsg.save();

    // Save assistant message
    const savedAssistantMsg = await Message.create({
      sessionId: session._id,
      isFromAi: true,
      content: assistantContent,
      suggestedQuestions,
      token: completionTokens,
      messageType: messageType || 'TEXT',
    });

    // Deduct tokens from user
    let remainingTokens = user.token ?? 0;
    if (isCustomer && totalTokens > 0) {
      remainingTokens = Math.max(0, remainingTokens - totalTokens);
      user.token = remainingTokens;
      await user.save();
    }

    // Update session lastMessageAt
    session.lastMessageAt = new Date();
    await session.save();

    // Async title generation on first user message
    if (isFirstUserMessage) {
      setImmediate(() =>
        this.generateTitleAsync(session, character, context, userMessageText, assistantContent)
      );
    }

    return {
      userMessage: mapToMessageResponse(savedUserMsg),
      assistantMessage: mapToMessageResponse(savedAssistantMsg),
      suggestedQuestions,
      remainingTokens,
      promptTokens,
      completionTokens,
    };
  }

  // ── POST /chat/messages/stream ────────────────────────────────────────────

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
        deletedAt: { $exists: false },
      });
      if (!session) throw new AppError('Không tìm thấy phiên chat', 404);

      const user = await User.findById(uid);
      if (!user) throw new AppError('Không tìm thấy người dùng', 404);
      const isCustomer = user.role === 'CUSTOMER';
      if (isCustomer && (user.token ?? 0) <= 0) {
        throw new AppError('Bạn đã hết token. Vui lòng nạp thêm để tiếp tục chat.', 400);
      }

      // Load existing history BEFORE saving new user message
      const existingMessages = await Message.find({
        sessionId: session._id,
        deletedAt: { $exists: false },
      }).sort({ createdAt: 1 });

      const userMessageCount = existingMessages.filter((m) => !m.isFromAi).length;
      const isFirstUserMessage = userMessageCount === 0;

      const savedUserMsg = await Message.create({
        sessionId: session._id,
        isFromAi: false,
        content: userMessageText,
        messageType: messageType || 'TEXT',
      });

      const character = await Character.findById(session.characterId).populate('contextIds');
      const context = await HistoricalContext.findById(session.contextId);
      if (!character) throw new AppError('Không tìm thấy nhân vật hoặc bối cảnh lịch sử', 404);

      // Last 5 existing messages (exclude current just-saved one), mirrors Java MAX_HISTORY_MESSAGES=5
      const MAX_HISTORY = 5;
      const recentMessages = existingMessages.slice(Math.max(0, existingMessages.length - MAX_HISTORY));
      const messageHistory = recentMessages.map((m) => ({
        role: m.isFromAi ? 'assistant' : 'user',
        content: m.content,
      }));

      const skipSuggestions = (messageType || '').toUpperCase() === 'VOICE';

      const payload = {
        characterId: character._id.toString(),
        contextId: context ? context._id.toString() : '00000000-0000-0000-0000-000000000000',
        userMessage: userMessageText,
        messageHistory,
        characterData: buildCharacterPayload(character),
        contextData: context ? buildContextPayload(context) : null,
        skipSuggestions,
      };

      let fullMessage = '';
      let promptToken = 0;
      let completionToken = 0;
      let suggestedQuestions: string[] = [];

      const response = await axios.post(`${AI_SERVICE_URL}/v1/ai/chat/stream`, payload, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream',
        timeout: 180000,
      });

      let streamBuffer = '';

      response.data.on('data', (chunk: Buffer) => {
        streamBuffer += chunk.toString();
        let eolIndex;
        while ((eolIndex = streamBuffer.indexOf('\n')) >= 0) {
          const line = streamBuffer.slice(0, eolIndex).trim();
          streamBuffer = streamBuffer.slice(eolIndex + 1);

          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            if (jsonStr === '[DONE]') continue; // Ignore [DONE] if sent by AI
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
              console.warn('[ChatService] Error parsing SSE chunk:', err, 'Raw JSON:', jsonStr);
            }
          }
        }
      });

      response.data.on('end', async () => {
        try {
          savedUserMsg.token = promptToken;
          await savedUserMsg.save();

          await Message.create({
            sessionId: session._id,
            isFromAi: true,
            content: fullMessage,
            suggestedQuestions,
            token: completionToken,
            messageType: messageType || 'TEXT',
          });

          const totalToken = promptToken + completionToken;
          let remainingTokens = user.token ?? 0;
          if (isCustomer && totalToken > 0) {
            remainingTokens = Math.max(0, remainingTokens - totalToken);
            user.token = remainingTokens;
            await user.save();
          }

          session.lastMessageAt = new Date();
          await session.save();

          if (isFirstUserMessage) {
            setImmediate(() =>
              this.generateTitleAsync(session, character, context, userMessageText, fullMessage)
            );
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

  // ── DELETE /chat/sessions/:id (hard delete) ───────────────────────────────

  /**
   * Hard-delete a session and all its messages.
   * Mirrors Java ChatSessionServiceImpl.deleteSession():
   *   - Admin/Staff can delete ANY session (bypass uid filter)
   *   - Regular user can only delete their own session
   */
  public async hardDeleteSession(sessionId: string, uid: string, role?: string): Promise<void> {
    const ADMIN_ROLES = ['SYSTEM_ADMIN', 'CONTENT_ADMIN', 'STAFF', 'ADMIN'];
    const isAdmin = role && ADMIN_ROLES.includes(role.toUpperCase());

    const filter: Record<string, any> = { _id: sessionId };
    if (!isAdmin) {
      // Non-admin: can only delete own sessions
      filter['uid'] = new mongoose.Types.ObjectId(uid);
    }

    const session = await ChatSession.findOneAndDelete(filter);
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);
    await Message.deleteMany({ sessionId: session._id });
  }

  // ── PATCH /chat/sessions/:id/soft-delete ─────────────────────────────────

  /**
   * Soft-delete a session AND all its child messages.
   * Mirrors Java ChatSessionServiceImpl.softDeleteSession() which cascades
   * deletedAt to all messages in the session.
   */
  public async softDeleteSession(sessionId: string, uid: string): Promise<void> {
    const now = new Date();
    const session = await ChatSession.findOneAndUpdate(
      { _id: sessionId, uid: new mongoose.Types.ObjectId(uid) },
      { $set: { deletedAt: now, isActive: false } },
      { new: true }
    );
    if (!session) throw new AppError('Không tìm thấy phiên chat', 404);

    // Mirrors Java: cascade soft-delete to all child messages
    await Message.updateMany(
      { sessionId: session._id },
      { $set: { deletedAt: now } }
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

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
        contextId: context ? context._id.toString() : '00000000-0000-0000-0000-000000000000',
        firstUserMessage: firstUserMsg,
        firstAssistantMessage: firstAiMsg,
        characterData: buildCharacterPayload(character),
        contextData: context ? buildContextPayload(context) : null,
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
}

export default new ChatService();
