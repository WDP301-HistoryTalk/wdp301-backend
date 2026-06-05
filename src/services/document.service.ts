import axios from 'axios';
import mongoose from 'mongoose';
import DocumentModel, { IDocumentEntity } from '../models/document.model';
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

  static async createContextDocument(userId: string, data: CreateContextDocumentInput): Promise<IDocumentEntity> {
    const context = await HistoricalContext.findOne({
      _id: data.contextId,
      deletedAt: { $exists: false },
    });
    if (!context) throw new AppError('Historical context not found', 404);

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

    return doc;
  }

  static async getDocumentsByContext(contextId: string): Promise<IDocumentEntity[]> {
    const context = await HistoricalContext.findOne({
      _id: contextId,
    });
    if (!context) throw new AppError('Historical context not found', 404);

    return DocumentModel.find({ entityId: context._id, entityType: EntityType.Context })
      .sort({ createdAt: -1 });
  }

  // ── Character Documents ────────────────────────────────────────────────────

  static async createCharacterDocument(userId: string, data: CreateCharacterDocumentInput): Promise<IDocumentEntity> {
    const character = await Character.findOne({
      _id: data.characterId,
      deletedAt: { $exists: false },
    });
    if (!character) throw new AppError('Character not found', 404);

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

    return doc;
  }

  static async getDocumentsByCharacter(characterId: string): Promise<IDocumentEntity[]> {
    const character = await Character.findOne({
      _id: characterId,
    });
    if (!character) throw new AppError('Character not found', 404);

    return DocumentModel.find({ entityId: character._id, entityType: EntityType.Character })
      .sort({ createdAt: -1 });
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  static async getDocumentById(docId: string): Promise<IDocumentEntity> {
    const doc = await DocumentModel.findById(docId);
    if (!doc) throw new AppError('Document not found', 404);
    return doc;
  }

  static async updateDocument(docId: string, data: UpdateDocumentInput): Promise<IDocumentEntity> {
    const doc = await DocumentModel.findByIdAndUpdate(
      docId,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!doc) throw new AppError('Document not found', 404);

    // Re-process in AI if content changed
    if (data.content) {
      setImmediate(() => triggerAiProcess(doc._id.toString(), doc.entityId.toString(), data.content!));
    }

    return doc;
  }

  static async deleteDocument(docId: string): Promise<void> {
    const doc = await DocumentModel.findByIdAndDelete(docId);
    if (!doc) throw new AppError('Document not found', 404);
    setImmediate(() => triggerAiDelete(docId));
  }

  static async getAllDocuments(entityType?: EntityType): Promise<IDocumentEntity[]> {
    const filter = entityType ? { entityType } : {};
    return DocumentModel.find(filter).sort({ createdAt: -1 });
  }
}

export default DocumentService;
