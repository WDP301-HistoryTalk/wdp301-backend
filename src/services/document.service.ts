import axios from 'axios';
import mongoose from 'mongoose';
import DocumentModel from '../models/document.model';
import HistoricalContext from '../models/historical-context.model';
import Character from '../models/character.model';
import { AppError } from '../utils/app-error';
import { EntityType } from '../types/enums';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// ─── AI Service Async Helpers ─────────────────────────────────────────────────

async function triggerAiProcess(docId: string, entityId: string, content: string): Promise<void> {
  try {
    await axios.post(`${AI_SERVICE_URL}/v1/ai/documents/process`, {
      doc_id: docId,
      entity_id: entityId,
      content,
    });
  } catch (err: any) {
    console.warn(`[DocumentService] AI process failed for ${docId}:`, err.message);
  }
}

async function triggerAiDelete(docId: string): Promise<void> {
  try {
    await axios.delete(`${AI_SERVICE_URL}/v1/ai/documents/${docId}`);
  } catch (err: any) {
    console.warn(`[DocumentService] AI delete failed for ${docId}:`, err.message);
  }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateContextDocumentInput {
  contextId: string;
  title: string;
  content: string;
  fileUrl?: string;
  type?: string;
}

export interface CreateCharacterDocumentInput {
  characterId: string;
  title: string;
  content: string;
  fileUrl?: string;
  type?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  fileUrl?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DocumentService {

  // ── Context Documents ──────────────────────────────────────────────────────

  static async createContextDocument(userId: string, data: CreateContextDocumentInput): Promise<any> {
    const context = await HistoricalContext.findOne({
      _id: data.contextId,
      deletedAt: { $exists: false },
    });
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    const doc = await DocumentModel.create({
      uploadedBy: new mongoose.Types.ObjectId(userId),
      entityId: context._id,
      entityType: EntityType.Context,
      title: data.title,
      content: data.content,
      fileUrl: data.fileUrl,
    });

    // Async AI processing — fire and forget
    const entityIdStr = context._id.toString();
    setImmediate(() => triggerAiProcess(doc._id.toString(), entityIdStr, data.content));

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, true);
  }

  static async getDocumentsByContext(contextId: string): Promise<any[]> {
    const context = await HistoricalContext.findOne({
      _id: contextId,
    });
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    const docs = await DocumentModel.find({ entityId: context._id, entityType: EntityType.Context })
      .populate('uploadedBy', 'userName')
      .sort({ createdAt: -1 });
    return docs.map(d => this.mapToResponse(d, true));
  }

  // ── Character Documents ────────────────────────────────────────────────────

  static async createCharacterDocument(userId: string, data: CreateCharacterDocumentInput): Promise<any> {
    const character = await Character.findOne({
      _id: data.characterId,
      deletedAt: { $exists: false },
    });
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    const doc = await DocumentModel.create({
      uploadedBy: new mongoose.Types.ObjectId(userId),
      entityId: character._id,
      entityType: EntityType.Character,
      title: data.title,
      content: data.content,
      fileUrl: data.fileUrl,
    });

    const entityIdStr = character._id.toString();
    setImmediate(() => triggerAiProcess(doc._id.toString(), entityIdStr, data.content));

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, false);
  }

  static async getDocumentsByCharacter(characterId: string): Promise<any[]> {
    const character = await Character.findOne({
      _id: characterId,
    });
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    const docs = await DocumentModel.find({ entityId: character._id, entityType: EntityType.Character })
      .populate('uploadedBy', 'userName')
      .sort({ createdAt: -1 });
    return docs.map(d => this.mapToResponse(d, false));
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  static async getDocumentById(docId: string): Promise<any> {
    const doc = await DocumentModel.findById(docId).populate('uploadedBy', 'userName');
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);
    return this.mapToResponse(doc, doc.entityType === EntityType.Context);
  }

  static async updateDocument(docId: string, data: UpdateDocumentInput): Promise<any> {
    const doc = await DocumentModel.findByIdAndUpdate(
      docId,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);

    // Re-process in AI if content changed
    if (data.content) {
      setImmediate(() => triggerAiProcess(doc._id.toString(), doc.entityId.toString(), data.content!));
    }

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, doc.entityType === EntityType.Context);
  }

  static async deleteDocument(docId: string): Promise<void> {
    const doc = await DocumentModel.findByIdAndDelete(docId);
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);
    setImmediate(() => triggerAiDelete(docId));
  }

  static async getAllDocuments(entityType?: EntityType): Promise<any[]> {
    const filter = entityType ? { entityType } : {};
    const docs = await DocumentModel.find(filter)
      .populate('uploadedBy', 'userName')
      .sort({ createdAt: -1 });
    return docs.map(d => this.mapToResponse(d, d.entityType === EntityType.Context));
  }

  private static mapToResponse(doc: any, isContext: boolean): any {
    if (!doc) return null;
    const rawId = doc._id || doc.id;
    const docIdStr = rawId ? rawId.toString() : '';
    const document = typeof doc.toObject === 'function' ? doc.toObject() : doc;

    const baseResponse: any = {
      docId: docIdStr,
      uid: (document.uploadedBy?._id || document.uploadedBy?.id) ? (document.uploadedBy._id || document.uploadedBy.id).toString() : document.uploadedBy?.toString() || '',
      userName: document.uploadedBy?.userName || 'Unknown',
      title: document.title,
      content: document.content,
      fileUrl: document.fileUrl || null,
      type: 'TEXT', // Defaulting to TEXT since type is not fully utilized yet
      uploadDate: document.createdAt,
      updatedDate: document.updatedAt,
      deletedAt: document.deletedAt || null,
    };

    if (isContext) {
      baseResponse.contextId = (document.entityId._id || document.entityId.id || document.entityId).toString();
    } else {
      baseResponse.characterId = (document.entityId._id || document.entityId.id || document.entityId).toString();
    }

    return baseResponse;
  }
}

export default DocumentService;
