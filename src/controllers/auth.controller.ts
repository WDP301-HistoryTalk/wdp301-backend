import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      sendSuccess(res, result, 'Đăng ký thành công');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      sendSuccess(res, result, 'Đăng nhập thành công');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.logout(req.user!.id);
      sendSuccess(res, null, 'Đăng xuất thành công');
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await AuthService.refreshTokens(req.body.refreshToken);
      sendSuccess(res, tokens, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.googleAuth(req.body.idToken);
      sendSuccess(res, result, 'Google login successful');
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.forgotPassword(req.body.email);
      sendSuccess(res, null, 'If that email exists, a reset link has been sent');
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await AuthService.resetPassword(req.params.token as string, req.body.password);
      sendSuccess(res, tokens, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  static async registerContentAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.registerContentAdmin(req.body);
      sendSuccess(res, result, 'Staff account created');
    } catch (error) {
      next(error);
    }
  }
}
