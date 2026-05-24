import { Request, Response } from 'express';
import DocumentService from '../services/document.service';
import { EntityType } from '../types/enums';

export class DocumentController {

  // ── Context Documents ──────────────────────────────────────────────────────

  public async createContextDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { contextId, title, content, fileUrl, type } = req.body;
      if (!contextId || !title || !content) {
        res.status(400).json({ success: false, message: 'contextId, title, and content are required' });
        return;
      }

      const doc = await DocumentService.createContextDocument(userId, { contextId, title, content, fileUrl, type });
      res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  public async getDocumentsByContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const docs = await DocumentService.getDocumentsByContext(contextId as string);
      res.status(200).json({ success: true, data: docs });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  // ── Character Documents ────────────────────────────────────────────────────

  public async createCharacterDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { characterId, title, content, fileUrl, type } = req.body;
      if (!characterId || !title || !content) {
        res.status(400).json({ success: false, message: 'characterId, title, and content are required' });
        return;
      }

      const doc = await DocumentService.createCharacterDocument(userId, { characterId, title, content, fileUrl, type });
      res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  public async getDocumentsByCharacter(req: Request, res: Response): Promise<void> {
    try {
      const { characterId } = req.params;
      const docs = await DocumentService.getDocumentsByCharacter(characterId as string);
      res.status(200).json({ success: true, data: docs });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  public async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const doc = await DocumentService.getDocumentById(req.params.docId as string);
      res.status(200).json({ success: true, data: doc });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  public async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, fileUrl } = req.body;
      const doc = await DocumentService.updateDocument(req.params.docId as string, { title, content, fileUrl });
      res.status(200).json({ success: true, message: 'Document updated successfully', data: doc });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  public async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      await DocumentService.deleteDocument(req.params.docId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  public async getAllDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { entityType } = req.query;
      const validType = entityType === EntityType.Context || entityType === EntityType.Character
        ? (entityType as EntityType)
        : undefined;
      const docs = await DocumentService.getAllDocuments(validType);
      res.status(200).json({ success: true, data: docs });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}

export default new DocumentController();
