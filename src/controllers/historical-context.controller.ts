import { Request, Response, NextFunction } from 'express';
import { HistoricalContextService } from '../services/historical-context.service';
import { sendSuccess } from '../utils/response';
import { EventEra, EventCategory } from '../types/enums';

export class HistoricalContextController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page = '1', limit = '10', era, category } = req.query;
      const result = await HistoricalContextService.list({
        search: search as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        era: era as EventEra,
        category: category as EventCategory,
      });
      sendSuccess(res, result, 'Historical contexts fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.findById(id as string);
      sendSuccess(res, { context }, 'Historical context fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const context = await HistoricalContextService.create(userId, req.body);
      sendSuccess(res, { context }, 'Historical context created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.update(id as string, req.body);
      sendSuccess(res, { context }, 'Historical context updated successfully');
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
      sendSuccess(res, { context }, 'Historical context soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.toggleActive(id as string);
      sendSuccess(res, { context, isActive: context.isActive }, 'Historical context active status toggled');
    } catch (error) {
      next(error);
    }
  }
}
