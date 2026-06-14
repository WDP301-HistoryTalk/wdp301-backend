import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import Quiz from '../models/quiz.model';
import Document from '../models/document.model';
import ChatSession from '../models/chat-session.model';
import QuizSession from '../models/quiz-session.model';
import Question from '../models/question.model';
import { EntityType } from '../types/enums';
import { DocumentService } from './document.service';

export interface TrashItemResponse {
  id: string;
  type: string;
  title: string;
  status: string;
  deletedAt: Date | null;
}

export interface BulkTrashActionResponse {
  requested: number;
  succeeded: number;
  results: {
    id: string;
    status: string;
    message: string;
  }[];
}

const RESTORED = "RESTORED";
const HARD_DELETED = "HARD_DELETED";
const NOT_FOUND = "NOT_FOUND";
const NOT_TRASHED = "NOT_TRASHED";

export class SystemTrashService {
  static async getDeletedCharacters(): Promise<TrashItemResponse[]> {
    const characters = await Character.find({ deletedAt: { $exists: true, $ne: null } });
    return characters.map(c => ({
      id: c._id.toString(),
      type: "CHARACTER",
      title: c.name,
      status: "INACTIVE",
      deletedAt: c.deletedAt || null,
    }));
  }

  static async getDeletedContexts(): Promise<TrashItemResponse[]> {
    const contexts = await HistoricalContext.find({ deletedAt: { $exists: true, $ne: null } });
    return contexts.map(c => ({
      id: c._id.toString(),
      type: "HISTORICAL_CONTEXT",
      title: c.name,
      status: "INACTIVE",
      deletedAt: c.deletedAt || null,
    }));
  }

  static async getDeletedQuizzes(): Promise<TrashItemResponse[]> {
    const quizzes = await Quiz.find({ deletedAt: { $exists: true, $ne: null } });
    return quizzes.map(q => ({
      id: q._id.toString(),
      type: "QUIZ",
      title: q.title,
      status: "INACTIVE",
      deletedAt: q.deletedAt || null,
    }));
  }

  static async restoreCharacters(ids: string[]): Promise<BulkTrashActionResponse> {
    return this.applyAction(ids, async (id) => {
      const character = await Character.findById(id);
      if (!character) return this.result(id, NOT_FOUND, "Không tìm thấy nhân vật");
      if (!character.deletedAt) return this.result(id, NOT_TRASHED, "Character is not in trash");
      
      await Character.updateOne({ _id: id }, { $unset: { deletedAt: 1 }, $set: { isActive: true } });
      return this.result(id, RESTORED, "Character restored");
    });
  }

  static async restoreContexts(ids: string[]): Promise<BulkTrashActionResponse> {
    return this.applyAction(ids, async (id) => {
      const context = await HistoricalContext.findById(id);
      if (!context) return this.result(id, NOT_FOUND, "Không tìm thấy bối cảnh lịch sử");
      if (!context.deletedAt) return this.result(id, NOT_TRASHED, "Historical context is not in trash");
      
      await HistoricalContext.updateOne({ _id: id }, { $unset: { deletedAt: 1 }, $set: { isActive: true } });
      return this.result(id, RESTORED, "Historical context restored");
    });
  }

  static async restoreQuizzes(ids: string[]): Promise<BulkTrashActionResponse> {
    return this.applyAction(ids, async (id) => {
      const quiz = await Quiz.findById(id);
      if (!quiz) return this.result(id, NOT_FOUND, "Không tìm thấy quiz");
      if (!quiz.deletedAt) return this.result(id, NOT_TRASHED, "Quiz is not in trash");
      
      await Quiz.updateOne({ _id: id }, { $unset: { deletedAt: 1 }, $set: { isActive: true } });
      return this.result(id, RESTORED, "Quiz restored");
    });
  }

  static async hardDeleteCharacters(ids: string[]): Promise<BulkTrashActionResponse> {
    return this.applyAction(ids, async (id) => {
      const character = await Character.findById(id);
      if (!character) return this.result(id, NOT_FOUND, "Không tìm thấy nhân vật");
      if (!character.deletedAt) return this.result(id, NOT_TRASHED, "Character is not in trash");
      
      await this.performHardDeleteCharacter(id);
      return this.result(id, HARD_DELETED, "Character permanently deleted");
    });
  }

  static async hardDeleteContexts(ids: string[]): Promise<BulkTrashActionResponse> {
    return this.applyAction(ids, async (id) => {
      const context = await HistoricalContext.findById(id);
      if (!context) return this.result(id, NOT_FOUND, "Không tìm thấy bối cảnh lịch sử");
      if (!context.deletedAt) return this.result(id, NOT_TRASHED, "Historical context is not in trash");
      
      await this.performHardDeleteContext(id);
      return this.result(id, HARD_DELETED, "Historical context permanently deleted");
    });
  }

  static async hardDeleteQuizzes(ids: string[]): Promise<BulkTrashActionResponse> {
    return this.applyAction(ids, async (id) => {
      const quiz = await Quiz.findById(id);
      if (!quiz) return this.result(id, NOT_FOUND, "Không tìm thấy quiz");
      if (!quiz.deletedAt) return this.result(id, NOT_TRASHED, "Quiz is not in trash");
      
      await Quiz.deleteOne({ _id: id });
      await Question.deleteMany({ quizId: id });
      await QuizSession.deleteMany({ quizId: id });
      return this.result(id, HARD_DELETED, "Quiz permanently deleted");
    });
  }

  private static async performHardDeleteCharacter(characterId: string) {
    const docs = await Document.find({ entityId: characterId, entityType: EntityType.Character });
    for (const doc of docs) {
      await DocumentService.deleteDocument(doc._id.toString());
    }
    await ChatSession.deleteMany({ characterId });
    await HistoricalContext.updateMany(
      { characterIds: characterId },
      { $pull: { characterIds: characterId } }
    );
    await Character.deleteOne({ _id: characterId });
  }

  private static async performHardDeleteContext(contextId: string) {
    const docs = await Document.find({ entityId: contextId, entityType: EntityType.Context });
    for (const doc of docs) {
      await DocumentService.deleteDocument(doc._id.toString());
    }
    await ChatSession.deleteMany({ contextId });
    await Character.updateMany(
      { contextIds: contextId },
      { $pull: { contextIds: contextId } }
    );
    await HistoricalContext.deleteOne({ _id: contextId });
  }

  private static async applyAction(
    rawIds: string[],
    action: (id: string) => Promise<{ id: string; status: string; message: string }>
  ): Promise<BulkTrashActionResponse> {
    const ids = Array.from(new Set((rawIds || []).filter(id => id && id.trim() !== "")));
    const results = [];
    for (const id of ids) {
      try {
        results.push(await action(id));
      } catch (err: any) {
        results.push(this.result(id, "ERROR", err.message || "Unknown error"));
      }
    }
    const succeeded = results.filter(r => r.status === RESTORED || r.status === HARD_DELETED).length;
    return {
      requested: ids.length,
      succeeded,
      results
    };
  }

  private static result(id: string, status: string, message: string) {
    return { id, status, message };
  }
}
