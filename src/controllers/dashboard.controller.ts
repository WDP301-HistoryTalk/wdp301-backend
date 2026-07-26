import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { PushService } from '../services/push.service';
import { AppError } from '../utils/app-error';
import { sendSuccess } from '../utils/response';

// Payload cua tung loai phai khop 100% voi noi dung thuc te gui trong
// scheduler.ts / payment.service.ts / subscription.service.ts, de nut test
// trong sidebar admin phan anh dung nhung gi user that se nhan duoc.
const TEST_NOTIFICATION_PAYLOADS = {
  daily_reminder: {
    title: 'Đừng bỏ lỡ chuỗi ngày học! 🔥',
    body: 'Hôm nay bạn chưa ghé HistoryTalk — vào học ngay để giữ chuỗi ngày học nhé.',
    data: { route: '/' },
  },
  payment_success: {
    title: 'Thanh toán thành công 🎉',
    body: 'Gói Plus đã được kích hoạt cho tài khoản của bạn.',
    data: { route: '/payment/history' },
  },
  subscription_expired: {
    title: 'Gói của bạn đã hết hạn',
    body: 'Gói dịch vụ đã hết hạn và được chuyển về gói Miễn phí. Gia hạn ngay để tiếp tục sử dụng đầy đủ tính năng.',
    data: { route: '/payment' },
  },
} as const;

type TestNotificationType = keyof typeof TEST_NOTIFICATION_PAYLOADS;

export class DashboardController {
  static async testNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type } = req.body as { type?: string };
      if (!type || !(type in TEST_NOTIFICATION_PAYLOADS)) {
        throw new AppError(
          `type phải là một trong: ${Object.keys(TEST_NOTIFICATION_PAYLOADS).join(', ')}`,
          400
        );
      }

      await PushService.sendToUser(req.user!.id, TEST_NOTIFICATION_PAYLOADS[type as TestNotificationType]);
      sendSuccess(res, null, 'Test notification sent');
    } catch (error) {
      next(error);
    }
  }

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
