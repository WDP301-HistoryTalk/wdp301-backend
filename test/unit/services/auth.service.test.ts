import { vi, type Mock } from 'vitest';
import { AuthService } from '../../../src/services/auth.service';
import User from '../../../src/models/user.model';
import Tier from '../../../src/models/tier.model';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../../src/types/enums';
import { mailService } from '../../../src/services/mail.service';

vi.mock('../../../src/models/user.model', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../../src/models/tier.model', () => ({
  __esModule: true,
  default: { findOne: vi.fn() },
}));

vi.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: vi.fn().mockReturnValue('mock-jwt-token'), verify: vi.fn() },
}));

const mockUser = {
  _id: { toString: () => 'user-id-123' },
  userName: 'Test User',
  email: 'test@example.com',
  role: UserRole.Customer,
  password: 'hashed-pw',
  toObject: vi.fn().mockReturnValue({
    _id: 'user-id-123',
    userName: 'Test User',
    email: 'test@example.com',
    role: UserRole.Customer,
  }),
};

describe('AuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('register', () => {
    it('returns success message on valid data', async () => {
      (User.findOne as Mock).mockResolvedValue(null);
      (Tier.findOne as Mock).mockResolvedValue({ _id: 'tier-id', limitedToken: 10 });
      (bcrypt.hash as Mock).mockResolvedValue('hashed-pw');
      (User.create as Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register({
        userName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('message');
    });

    it('throws 409 when email exists', async () => {
      (User.findOne as Mock).mockResolvedValue(mockUser);

      await expect(
        AuthService.register({ userName: 'Test User', email: 'test@example.com', password: 'pw' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('login', () => {
    it('returns token payload on valid credentials', async () => {
      (User.findOne as Mock).mockReturnValue({ select: vi.fn().mockResolvedValue(mockUser) });
      (bcrypt.compare as Mock).mockResolvedValue(true);
      (User.findByIdAndUpdate as Mock).mockResolvedValue(null);

      const result = await AuthService.login({ email: 'test@example.com', password: 'pw123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('uid');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result.role).toBe(UserRole.Customer);
    });

    it('throws 401 on wrong password', async () => {
      (User.findOne as Mock).mockReturnValue({ select: vi.fn().mockResolvedValue(mockUser) });
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(
        AuthService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when user not found', async () => {
      (User.findOne as Mock).mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

      await expect(
        AuthService.login({ email: 'nobody@example.com', password: 'any' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('logout', () => {
    it('clears refresh token from user document', async () => {
      (User.findByIdAndUpdate as Mock).mockResolvedValue(null);

      await AuthService.logout('user-id-123');

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({ $unset: { refreshToken: 1 } })
      );
    });
  });

  describe('googleAuth', () => {
    it('creates new user and sends email if user does not exist', async () => {
      const { OAuth2Client } = require('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        getPayload: vi.fn().mockReturnValue({ email: 'new@example.com', name: 'New', sub: 'g-id' })
      });
      OAuth2Client.prototype.verifyIdToken = mockVerifyIdToken;

      (User.findOne as Mock).mockResolvedValue(null);
      (Tier.findOne as Mock).mockResolvedValue({ _id: 'tier-id', limitedToken: 10 });
      (User.create as Mock).mockResolvedValue({ ...mockUser, email: 'new@example.com', googleId: 'g-id' });
      
      vi.spyOn(mailService, 'sendLoginNotificationWithPassword').mockResolvedValue();

      const result = await AuthService.googleAuth('token');
      expect(result).toHaveProperty('accessToken');
      expect(User.create).toHaveBeenCalled();
      expect(mailService.sendLoginNotificationWithPassword).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('generates token and sends email if user exists', async () => {
      (User.findOne as Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as Mock).mockResolvedValue(mockUser);
      
      vi.spyOn(mailService, 'sendPasswordResetEmail').mockResolvedValue();

      await AuthService.forgotPassword('test@example.com');
      
      expect(User.findByIdAndUpdate).toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });
});
