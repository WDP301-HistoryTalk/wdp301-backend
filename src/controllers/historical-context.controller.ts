import { Request, Response, NextFunction } from 'express';
import { HistoricalContextService } from '../services/historical-context.service';
import { sendSuccess } from '../utils/response';
import { EventEra, UserRole } from '../types/enums';

export class HistoricalContextController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page = '1', limit = '10', era } = req.query;
      // Check if user is admin/staff to include unpublished contexts
      const userRole = req.user?.role;
      const includeUnpublished = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;
      
      const result = await HistoricalContextService.list({
        search: search as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        era: era as EventEra,
        includeUnpublished,
      });
      sendSuccess(res, result, 'Historical contexts fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // Check if user is admin/staff to include unpublished contexts
      const userRole = req.user?.role;
      const includeUnpublished = userRole === UserRole.ContentAdmin || userRole === UserRole.SystemAdmin;
      
      const context = await HistoricalContextService.findById(id as string, includeUnpublished);
      const responseData = {
        ...context.toObject(),
        id: context._id.toString(),
      };
      sendSuccess(res, responseData, 'Historical context fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const context = await HistoricalContextService.create(userId, req.body);
      const responseData = {
        ...context.toObject(),
        id: context._id.toString(),
      };
      sendSuccess(res, responseData, 'Historical context created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.update(id as string, req.body);
      const responseData = {
        ...context.toObject(),
        id: context._id.toString(),
      };
      sendSuccess(res, responseData, 'Historical context updated successfully');
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
      const responseData = {
        ...context.toObject(),
        id: context._id.toString(),
      };
      sendSuccess(res, responseData, 'Historical context soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const context = await HistoricalContextService.toggleActive(id as string);
      const responseData = {
        ...context.toObject(),
        id: context._id.toString(),
        isActive: context.isActive,
      };
      sendSuccess(res, responseData, 'Historical context active status toggled');
    } catch (error) {
      next(error);
    }
  }
}
