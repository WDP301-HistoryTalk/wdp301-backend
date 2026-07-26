import { Request, Response, NextFunction } from 'express';
import DocumentService from '../services/document.service';
import { EntityType, UserRole } from '../types/enums';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/app-error';

function isAdminRequest(req: Request): boolean {
  const role = req.user?.role;
  return role === UserRole.ContentAdmin || role === UserRole.SystemAdmin;
}

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
      const docs = await DocumentService.getDocumentsByContext(contextId as string, isAdminRequest(req));
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
      const docs = await DocumentService.getDocumentsByCharacter(characterId as string, isAdminRequest(req));
      sendSuccess(res, docs, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  public async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await DocumentService.getDocumentById(req.params.docId as string, isAdminRequest(req));
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
      const docs = await DocumentService.getAllDocuments(validType, isAdminRequest(req));
      sendSuccess(res, docs, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async uploadPdfFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { throw new AppError('Không có quyền truy cập', 401); }

      const file = req.file;
      if (!file) { throw new AppError('Yêu cầu chọn file PDF', 400); }

      const { docId } = req.params;
      const doc = await DocumentService.uploadPdfFile(docId as string, file, userId);
      sendSuccess(res, doc, 'PDF file uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  public async createPdfUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { docId } = req.params;
      const signedUrlData = await DocumentService.createPdfUrl(docId as string);
      sendSuccess(res, signedUrlData, 'PDF URL generated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async extractPdfText(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) { throw new AppError('Yêu cầu chọn file PDF', 400); }

      const result = await DocumentService.extractPdfText(file.buffer);
      sendSuccess(res, result, 'PDF text extracted successfully');
    } catch (error) {
      next(error);
    }
  }

  public async uploadAndExtractPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) { throw new AppError('Yêu cầu chọn file PDF', 400); }

      const { entityType, entityId } = req.body;
      const result = await DocumentService.uploadAndExtractPdf(file, entityType, entityId);
      sendSuccess(res, result, 'PDF file uploaded and text extracted successfully');
    } catch (error) {
      next(error);
    }
  }

  public async saveDocumentContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const docId = req.params.docId || req.body.docId;
      const { content, status } = req.body;
      if (!docId) { throw new AppError('Yêu cầu cung cấp docId', 400); }
      if (!content) { throw new AppError('Nội dung không được để trống', 400); }

      const doc = await DocumentService.saveDocumentContent(docId as string, content, status);
      sendSuccess(res, doc, 'Document content saved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new DocumentController();
