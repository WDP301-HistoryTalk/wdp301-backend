import { Request, Response, NextFunction } from 'express';
import { CharacterService } from '../services/character.service';
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
      const includeInactive = isAdmin; // Admin can see trashed (isActive: false) items

      const result = await CharacterService.list({
        search: search as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        era: era as EventEra,
        includeUnpublished,
        includeInactive,
      });
      const transformedContent = result.content.map(char => {
        return {
          ...char,
          context: (char.contextIds && char.contextIds.length > 0) ? { contextId: (char.contextIds[0] as any).contextId || char.contextIds[0] } : undefined,
          contexts: char.contextIds ? char.contextIds.map((ctx: any) => ({ contextId: ctx.contextId || ctx, name: ctx.name })) : [],
        };
      });
      
      const responseData = { ...result, content: transformedContent };
      delete (responseData as any).contextIds;
      sendSuccess(res, responseData, 'Characters fetched successfully');
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

      // Transform contextIds to nested contexts object in response
      const transformedCharacters = characters.map(char => {
        const charObj = char.toObject();
        const responseChar = {
          ...charObj,
          id: char._id.toString(),
          context: (charObj.contextIds && charObj.contextIds.length > 0) ? { contextId: (charObj.contextIds[0] as any).contextId || charObj.contextIds[0] } : undefined,
          contexts: charObj.contextIds ? charObj.contextIds.map((ctx: any) => ({ contextId: ctx.contextId || ctx, name: ctx.name })) : [],
        };
        delete (responseChar as any).contextIds;
        return responseChar;
      });

      sendSuccess(res, { characters: transformedCharacters }, 'Characters fetched successfully');
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
      const charObj = character.toObject();
      const responseData = {
        ...charObj,
        id: character._id.toString(),
        context: (charObj.contextIds && charObj.contextIds.length > 0) ? { contextId: (charObj.contextIds[0] as any).contextId || charObj.contextIds[0] } : undefined,
        contexts: charObj.contextIds ? charObj.contextIds.map((ctx: any) => ({ contextId: ctx.contextId || ctx, name: ctx.name })) : [],
      };
      delete (responseData as any).contextIds;
      sendSuccess(res, responseData, 'Character fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const character = await CharacterService.create(userId, req.body);
      // Return both _id (as id) and characterId for FE compatibility
      const charObj = character.toObject();
      const responseData = {
        ...charObj,
        id: character._id.toString(),
        context: (charObj.contextIds && charObj.contextIds.length > 0) ? { contextId: (charObj.contextIds[0] as any).contextId || charObj.contextIds[0] } : undefined,
        contexts: charObj.contextIds ? charObj.contextIds.map((ctx: any) => ({ contextId: ctx.contextId || ctx, name: ctx.name })) : [],
      };
      delete (responseData as any).contextIds;
      sendSuccess(res, responseData, 'Character created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.update(id as string, req.body);
      const charObj = character.toObject();
      const responseData = {
        ...charObj,
        id: character._id.toString(),
        context: (charObj.contextIds && charObj.contextIds.length > 0) ? { contextId: (charObj.contextIds[0] as any).contextId || charObj.contextIds[0] } : undefined,
        contexts: charObj.contextIds ? charObj.contextIds.map((ctx: any) => ({ contextId: ctx.contextId || ctx, name: ctx.name })) : [],
      };
      delete (responseData as any).contextIds;
      sendSuccess(res, responseData, 'Character updated successfully');
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
      const charObj = character.toObject();
      const responseData = {
        ...charObj,
        id: character._id.toString(),
        context: (charObj.contextIds && charObj.contextIds.length > 0) ? { contextId: (charObj.contextIds[0] as any).contextId || charObj.contextIds[0] } : undefined,
        contexts: charObj.contextIds ? charObj.contextIds.map((ctx: any) => ({ contextId: ctx.contextId || ctx, name: ctx.name })) : [],
      };
      delete (responseData as any).contextIds;
      sendSuccess(res, responseData, 'Character soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.toggleActive(id as string);
      const charObj = character.toObject();
      const responseData = {
        ...charObj,
        id: character._id.toString(),
        isActive: character.isActive,
        context: (charObj.contextIds && charObj.contextIds.length > 0) ? { contextId: (charObj.contextIds[0] as any).contextId || charObj.contextIds[0] } : undefined,
        contexts: charObj.contextIds ? charObj.contextIds.map((ctx: any) => ({ contextId: ctx.contextId || ctx, name: ctx.name })) : [],
      };
      delete (responseData as any).contextIds;
      sendSuccess(res, responseData, 'Character active status toggled');
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
        contextId: ctx.contextId || ctx,
        name: ctx.name
      }));
      
      sendSuccess(res, transformedContexts, 'Character contexts fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
