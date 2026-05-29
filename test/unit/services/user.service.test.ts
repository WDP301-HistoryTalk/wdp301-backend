import { vi, type Mock } from 'vitest';
import { UserService } from '../../../src/services/user.service';
import User from '../../../src/models/user.model';

vi.mock('../../../src/models/user.model', () => ({
  __esModule: true,
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

const mockUser = {
  _id: 'user-id-123',
  userName: 'Test User',
  email: 'test@example.com',
  save: vi.fn().mockResolvedValue(true),
};

describe('UserService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('findUserById', () => {
    it('returns user when found', async () => {
      (User.findById as Mock).mockReturnValue({ populate: vi.fn().mockResolvedValue(mockUser) });

      const result = await UserService.findUserById('user-id-123');
      expect(result).toEqual(mockUser);
    });

    it('throws 404 when not found', async () => {
      (User.findById as Mock).mockReturnValue({ populate: vi.fn().mockResolvedValue(null) });

      await expect(UserService.findUserById('bad-id')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateProfile', () => {
    it('returns updated user', async () => {
      (User.findByIdAndUpdate as Mock).mockReturnValue({
        populate: vi.fn().mockResolvedValue({ ...mockUser, userName: 'Updated' }),
      });

      const result = await UserService.updateProfile('user-id-123', { userName: 'Updated' });
      expect(result).toHaveProperty('userName', 'Updated');
    });

    it('throws 404 when user not found', async () => {
      (User.findByIdAndUpdate as Mock).mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      await expect(UserService.updateProfile('bad-id', {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
