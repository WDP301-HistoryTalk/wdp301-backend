import { Request, Response, NextFunction } from 'express';
import DocumentService from '../services/document.service';
import { EntityType } from '../types/enums';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/app-error';

export class DocumentController {

  // ── Context Documents ──────────────────────────────────────────────────────

  public async createContextDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { throw new AppError('Không có quyền truy cập', 401); }

      const { contextId, title, content, fileUrl, type } = req.body;
      if (!contextId || !title || !content) {
        throw new AppError('Yêu cầu cung cấp contextId, title và content', 400);
      }

      const doc = await DocumentService.createContextDocument(userId, { contextId, title, content, fileUrl, type });
      sendSuccess(res, doc, 'Document uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async getDocumentsByContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contextId } = req.params;
      const docs = await DocumentService.getDocumentsByContext(contextId as string);
      sendSuccess(res, docs, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── Character Documents ────────────────────────────────────────────────────

  public async createCharacterDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { throw new AppError('Không có quyền truy cập', 401); }

      const { characterId, title, content, fileUrl, type } = req.body;
      if (!characterId || !title || !content) {
        throw new AppError('Yêu cầu cung cấp characterId, title và content', 400);
      }

      const doc = await DocumentService.createCharacterDocument(userId, { characterId, title, content, fileUrl, type });
      sendSuccess(res, doc, 'Document uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async getDocumentsByCharacter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId } = req.params;
      const docs = await DocumentService.getDocumentsByCharacter(characterId as string);
      sendSuccess(res, docs, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  public async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await DocumentService.getDocumentById(req.params.docId as string);
      sendSuccess(res, doc, 'Document retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async updateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, fileUrl } = req.body;
      const doc = await DocumentService.updateDocument(req.params.docId as string, { title, content, fileUrl });
      sendSuccess(res, doc, 'Document updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await DocumentService.deleteDocument(req.params.docId as string);
      sendSuccess(res, null, 'Document deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getAllDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType } = req.query;
      const validType = entityType === EntityType.Context || entityType === EntityType.Character
        ? (entityType as EntityType)
        : undefined;
      const docs = await DocumentService.getAllDocuments(validType);
      sendSuccess(res, docs, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new DocumentController();
