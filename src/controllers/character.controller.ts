import { Request, Response, NextFunction } from 'express';
import { CharacterService } from '../services/character.service';
import { sendSuccess } from '../utils/response';
import { EventEra } from '../types/enums';

export class CharacterController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page = '1', limit = '10', era } = req.query;
      const result = await CharacterService.list({
        search: search as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        era: era as EventEra,
      });
      sendSuccess(res, result, 'Characters fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listByContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contextId } = req.params;
      const characters = await CharacterService.listByContextId(contextId as string);
      sendSuccess(res, { characters }, 'Characters fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.findById(id as string);
      sendSuccess(res, { character }, 'Character fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const character = await CharacterService.create(userId, req.body);
      sendSuccess(res, { character }, 'Character created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.update(id as string, req.body);
      sendSuccess(res, { character }, 'Character updated successfully');
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
      sendSuccess(res, { character }, 'Character soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const character = await CharacterService.toggleActive(id as string);
      sendSuccess(res, { character, isActive: character.isActive }, 'Character active status toggled');
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
}
