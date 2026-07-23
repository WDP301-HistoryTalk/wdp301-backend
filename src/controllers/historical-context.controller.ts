import { Request, Response, NextFunction } from 'express';
import { GamificationService } from '../services/gamification.service';
import { HistoricalContextService } from '../services/historical-context.service';
import DocumentService from '../services/document.service';
import { sendSuccess } from '../utils/response';
import { EventEra, EventCategory, UserRole } from '../types/enums';

export class HistoricalContextController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page = '1', limit = '6', era, category } = req.query;
      // Check if user is admin/staff to include unpublished and inactive contexts
      const userRole = req.user?.role;
      const isAdmin = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;
      const includeUnpublished = isAdmin;
      const includeInactive = false;

      const result = await HistoricalContextService.list({
        search: search as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        era: era as EventEra,
        category: category as EventCategory,
        includeUnpublished,
        includeInactive,
      });
      sendSuccess(res, result, 'Historical contexts fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // Check if user is admin/staff to include unpublished and inactive contexts
      const userRole = req.user?.role;
      const isAdmin = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;
      const includeUnpublished = isAdmin;
      const includeInactive = isAdmin;
      
      const context = await HistoricalContextService.findById(id as string, includeUnpublished, includeInactive);

      // Gamification: user đã đăng nhập mở chi tiết bối cảnh → tính quest "đọc"
      const readerId = req.user?.id;
      if (readerId) {
        setImmediate(() => void GamificationService.recordProgress(readerId, 'READ_CONTEXT'));
      }

      sendSuccess(res, context, 'Historical context fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const context = await HistoricalContextService.create(userId, req.body);
      sendSuccess(res, context, 'Historical context created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.update(id as string, req.body);
      sendSuccess(res, context, 'Historical context updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await HistoricalContextService.delete(id as string);
      sendSuccess(res, null, 'Historical context deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async softDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.softDelete(id as string);
      sendSuccess(res, context, 'Historical context soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.toggleActive(id as string);
      sendSuccess(res, context, 'Historical context active status toggled');
    } catch (error) {
      next(error);
    }
  }

  static async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // We can reuse the DocumentService to fetch documents for this context ID
      const docs = await DocumentService.getDocumentsByContext(id as string);
      sendSuccess(res, docs, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadDirectMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contextId = (req.params.contextId || req.params.id) as string;
      const file = req.file;
      const mediaType = (req.query.mediaType as string) || (req.body.mediaType as string) || 'IMAGE_2D';

      if (!file) {
        res.status(400).json({ success: false, message: 'Yêu cầu đính kèm file media' });
        return;
      }

      const response = await HistoricalContextService.uploadDirectMedia(contextId, file, mediaType);
      sendSuccess(res, response, 'Media uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getViewUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contextId = (req.params.contextId || req.params.id) as string;
      const response = await HistoricalContextService.generateSignedViewUrl(contextId);
      sendSuccess(res, response, 'View URL generated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contextId = (req.params.contextId || req.params.id) as string;
      await HistoricalContextService.deleteMedia(contextId);
      sendSuccess(res, null, 'Media deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

