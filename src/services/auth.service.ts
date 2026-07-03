import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';
import { AppError } from '../utils/app-error';
import User from '../models/user.model';
import Tier from '../models/tier.model';
import { UserRole, TierTitle } from '../types/enums';
import { mailService } from './mail.service';

const googleClient = new OAuth2Client(config.google.clientId);

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function parseExpiresInToSeconds(str: string): number {
  const match = str.match(/^(\d+)([mhd])$/);
  if (!match) return 900;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 3600;
  if (unit === 'd') return value * 86400;
  return value;
}

export class AuthService {
  // ─── Token helpers ────────────────────────────────────────────────────────

  static generateTokens(userId: string, email: string, role: UserRole): TokenPair {
    const accessToken = jwt.sign({ id: userId, email, role }, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiresIn,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign({ id: userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  private static async saveRefreshToken(userId: string, refreshToken: string) {
    await User.findByIdAndUpdate(userId, { refreshToken });
  }

  // ─── F-01: Register ───────────────────────────────────────────────────────

  static async register(data: { userName: string; email: string; password: string }) {
    const exists = await User.findOne({ email: data.email });
    if (exists) throw new AppError('Email đã được đăng ký', 409);

    const freeTier = await Tier.findOne({ title: TierTitle.Free });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    await User.create({
      userName: data.userName,
      email: data.email,
      password: hashedPassword,
      role: UserRole.Customer,
      tierId: freeTier?._id,
      token: freeTier?.limitedToken ?? 10,
      lastTokenResetAt: new Date(),
    });

    return { message: 'Account created successfully' };
  }

  // ─── F-02: Login / Logout ─────────────────────────────────────────────────

  static async login(data: { email: string; password: string }) {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user || !user.password) throw new AppError('Email hoặc mật khẩu không chính xác', 401);

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new AppError('Email hoặc mật khẩu không chính xác', 401);

    if (user.deletedAt) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 401);
    }

    await User.findByIdAndUpdate(user._id, { lastActiveDate: new Date() });

    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);
    await this.saveRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      uid: user._id.toString(),
      userName: user.userName,
      email: user.email,
      role: user.role,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseExpiresInToSeconds(config.jwt.accessExpiresIn),
    };
  }

  static async logout(userId: string) {
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
  }

  // ─── Refresh token ────────────────────────────────────────────────────────

  static async refreshTokens(incomingRefreshToken: string) {
    let decoded: { id: string };
    try {
      decoded = jwt.verify(incomingRefreshToken, config.jwt.refreshSecret) as { id: string };
    } catch {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new AppError('Refresh token không hợp lệ hoặc đã bị thu hồi', 401);
    }

    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);
    await this.saveRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  // ─── F-03: Google OAuth ───────────────────────────────────────────────────

  static async googleAuth(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) throw new AppError('Google token không hợp lệ', 400);

    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const freeTier = await Tier.findOne({ title: TierTitle.Free });
      
      const randomPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        userName: name ?? email.split('@')[0],
        email,
        password: hashedPassword,
        googleId,
        role: UserRole.Customer,
        tierId: freeTier?._id,
        token: freeTier?.limitedToken ?? 10,
        lastTokenResetAt: new Date(),
      });

      // Gửi mail thông báo đăng nhập và mật khẩu ngẫu nhiên
      mailService.sendLoginNotificationWithPassword(email, user.userName, randomPassword).catch(console.error);
    } else if (!user.googleId) {
      await User.findByIdAndUpdate(user._id, { googleId });
    }

    if (user.deletedAt) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 401);
    }

    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);
    await this.saveRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      uid: user._id.toString(),
      userName: user.userName,
      email: user.email,
      role: user.role,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseExpiresInToSeconds(config.jwt.accessExpiresIn),
    };
  }

  // ─── F-04: Password reset ─────────────────────────────────────────────────

  static async forgotPassword(email: string) {
    const user = await User.findOne({ email });
    if (!user) return; // silent — don't leak whether email exists

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    mailService.sendPasswordResetEmail(user.email, user.userName, resetUrl).catch(console.error);
  }

  static async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) throw new AppError('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      $unset: { passwordResetToken: 1, passwordResetExpires: 1, refreshToken: 1 },
    });

    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);
    await this.saveRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  // ─── Register content admin (System Admin only) ───────────────────────────

  static async registerContentAdmin(data: {
    userName: string;
    name: string;
    email: string;
    password: string;
    roleName: UserRole.ContentAdmin | UserRole.SystemAdmin;
  }) {
    const exists = await User.findOne({ email: data.email });
    if (exists) throw new AppError('Email đã được đăng ký', 409);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    await User.create({
      userName: data.userName,
      email: data.email,
      password: hashedPassword,
      role: data.roleName,
      token: 9999,
      lastTokenResetAt: new Date(),
    });

    return { message: 'Staff account created successfully' };
  }
}
