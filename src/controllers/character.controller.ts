import { Request, Response, NextFunction } from 'express';
import { CharacterService } from '../services/character.service';
import DocumentService from '../services/document.service';
import { sendSuccess } from '../utils/response';
import { EventEra, UserRole } from '../types/enums';

export class CharacterController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page = '1', limit = '10', era } = req.query;
      // Check if user is admin/staff
      const userRole = req.user?.role;
      const isAdmin = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;
      const includeUnpublished = isAdmin;
      const includeInactive = false; // Trashed items are only exposed via /system/trash

      const result = await CharacterService.list({
        search: search as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        era: era as EventEra,
        includeUnpublished,
        includeInactive,
      });
      sendSuccess(res, result, 'Characters fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listByContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contextId } = req.params;
      // Check if user is admin/staff to include unpublished characters
      const userRole = req.user?.role;
      const includeUnpublished = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;

      const characters = await CharacterService.listByContextId(contextId as string, includeUnpublished);

      sendSuccess(res, characters, 'Characters fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // Check if user is admin/staff
      const userRole = req.user?.role;
      const isAdmin = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;
      const includeUnpublished = isAdmin;
      const includeInactive = isAdmin; // Admin can see trashed (isActive: false) items

      const character = await CharacterService.findById(id as string, includeUnpublished, includeInactive);
      sendSuccess(res, character, 'Character fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const character = await CharacterService.create(userId, req.body);
      sendSuccess(res, character, 'Character created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.update(id as string, req.body);
      sendSuccess(res, character, 'Character updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await CharacterService.delete(id as string);
      sendSuccess(res, null, 'Character deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async softDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.softDelete(id as string);
      sendSuccess(res, character, 'Character soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.toggleActive(id as string);
      sendSuccess(res, character, 'Character active status toggled');
    } catch (error) {
      next(error);
    }
  }

  static async attachToContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId, contextId } = req.params;
      await CharacterService.attachToContext(characterId as string, contextId as string);
      sendSuccess(res, null, 'Character attached to context successfully');
    } catch (error) {
      next(error);
    }
  }

  static async removeFromContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId, contextId } = req.params;
      await CharacterService.removeFromContext(characterId as string, contextId as string);
      sendSuccess(res, null, 'Character removed from context successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getContexts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId } = req.params;
      const userRole = req.user?.role;
      const includeUnpublished = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;
      
      const contexts = await CharacterService.getContextsOfCharacter(characterId as string, includeUnpublished);
      const transformedContexts = contexts.map((ctx: any) => ({
        contextId: ctx._id || ctx,
        name: ctx.name
      }));
      
      sendSuccess(res, transformedContexts, 'Character contexts fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const docs = await DocumentService.getDocumentsByCharacter(id as string);
      sendSuccess(res, docs, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadDirectMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId } = req.params;
      const file = req.file;
      const mediaType = (req.query.mediaType as string) || (req.body.mediaType as string) || 'IMAGE_2D';

      if (!file) {
        res.status(400).json({ success: false, message: 'Yêu cầu đính kèm file media' });
        return;
      }

      const response = await CharacterService.uploadDirectMedia(characterId as string, file, mediaType);
      sendSuccess(res, response, 'Media uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getViewUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId } = req.params;
      const response = await CharacterService.generateSignedViewUrl(characterId as string);
      sendSuccess(res, response, 'View URL generated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { characterId } = req.params;
      await CharacterService.deleteMedia(characterId as string);
      sendSuccess(res, null, 'Media deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

