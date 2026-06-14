import { Request, Response, NextFunction } from 'express';
import { SystemTrashService } from '../services/system-trash.service';
import { sendSuccess } from '../utils/response';

export class SystemTrashController {
  static async getDeletedCharacters(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SystemTrashService.getDeletedCharacters();
      sendSuccess(res, result, "Trashed characters retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getDeletedContexts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SystemTrashService.getDeletedContexts();
      sendSuccess(res, result, "Trashed historical contexts retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getDeletedQuizzes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SystemTrashService.getDeletedQuizzes();
      sendSuccess(res, result, "Trashed quizzes retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async restoreCharacters(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await SystemTrashService.restoreCharacters(ids || []);
      sendSuccess(res, result, "Character restore completed");
    } catch (error) {
      next(error);
    }
  }

  static async restoreContexts(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await SystemTrashService.restoreContexts(ids || []);
      sendSuccess(res, result, "Historical context restore completed");
    } catch (error) {
      next(error);
    }
  }

  static async restoreQuizzes(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await SystemTrashService.restoreQuizzes(ids || []);
      sendSuccess(res, result, "Quiz restore completed");
    } catch (error) {
      next(error);
    }
  }

  static async hardDeleteCharacters(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await SystemTrashService.hardDeleteCharacters(ids || []);
      sendSuccess(res, result, "Character hard delete completed");
    } catch (error) {
      next(error);
    }
  }

  static async hardDeleteContexts(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await SystemTrashService.hardDeleteContexts(ids || []);
      sendSuccess(res, result, "Historical context hard delete completed");
    } catch (error) {
      next(error);
    }
  }

  static async hardDeleteQuizzes(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await SystemTrashService.hardDeleteQuizzes(ids || []);
      sendSuccess(res, result, "Quiz hard delete completed");
    } catch (error) {
      next(error);
    }
  }
}
