import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export class DashboardController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getOverview();
      sendSuccess(res, data, 'Dashboard overview retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await DashboardService.getUserAnalytics(from as string, to as string, granularity as string);
      sendSuccess(res, data, 'User analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getContentSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getContentSummary();
      sendSuccess(res, data, 'Content summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getChatActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await DashboardService.getChatActivity(from as string, to as string, granularity as string);
      sendSuccess(res, data, 'Chat activity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getSystemHealth();
      sendSuccess(res, data, 'System health retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await DashboardService.getRevenue(from as string, to as string, granularity as string);
      sendSuccess(res, data, 'Revenue analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await DashboardService.getPayments(from as string, to as string, granularity as string);
      sendSuccess(res, data, 'Payment analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTiers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await DashboardService.getTiers(from as string, to as string, granularity as string);
      sendSuccess(res, data, 'Tier analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await DashboardService.getQuiz(from as string, to as string, granularity as string);
      sendSuccess(res, data, 'Quiz analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await DashboardService.getTokens(from as string, to as string, granularity as string);
      sendSuccess(res, data, 'Token usage analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
