import { vi, type Mock } from 'vitest';
import { UserService } from '../../../src/services/user.service';
import User from '../../../src/models/user.model';
import bcrypt from 'bcryptjs';

vi.mock('../../../src/models/user.model', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    genSalt: vi.fn(),
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const mockUserData = {
  _id: 'mock-id-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  password: 'hashed-password',
  toObject: vi.fn().mockReturnValue({
    _id: 'mock-id-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  }),
};

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a user and return a token', async () => {
      (User.findOne as Mock).mockResolvedValue(null);
      (bcrypt.genSalt as Mock).mockResolvedValue('salt');
      (bcrypt.hash as Mock).mockResolvedValue('hashed-password');
      (User.create as Mock).mockResolvedValue(mockUserData);

      const result = await UserService.registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw 409 when email already exists', async () => {
      (User.findOne as Mock).mockResolvedValue(mockUserData);

      await expect(
        UserService.registerUser({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('loginUser', () => {
    it('should return a token on valid credentials', async () => {
      (User.findOne as Mock).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUserData),
      });
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const result = await UserService.loginUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw 401 when user is not found', async () => {
      (User.findOne as Mock).mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      await expect(
        UserService.loginUser({ email: 'nobody@example.com', password: 'any' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 401 when password does not match', async () => {
      (User.findOne as Mock).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUserData),
      });
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(
        UserService.loginUser({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      (User.findById as Mock).mockResolvedValue(mockUserData);

      const result = await UserService.findUserById('mock-id-123');
      expect(result).toEqual(mockUserData);
    });

    it('should throw 404 when user does not exist', async () => {
      (User.findById as Mock).mockResolvedValue(null);

      await expect(UserService.findUserById('nonexistent-id')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
