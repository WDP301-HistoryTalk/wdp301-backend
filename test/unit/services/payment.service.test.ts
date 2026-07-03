import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PaymentService } from '../../../src/services/payment.service';
import Order from '../../../src/models/order.model';
import Tier from '../../../src/models/tier.model';
import User from '../../../src/models/user.model';
import Transaction from '../../../src/models/transaction.model';
import { payos } from '../../../src/services/payos.client';
import { OrderStatus } from '../../../src/types/enums';

vi.mock('../../../src/models/order.model', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    exists: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../../src/models/tier.model', () => ({
  __esModule: true,
  default: { findById: vi.fn(), findOne: vi.fn(), find: vi.fn() },
}));

vi.mock('../../../src/models/user.model', () => ({
  __esModule: true,
  default: { findById: vi.fn() },
}));

vi.mock('../../../src/models/transaction.model', () => ({
  __esModule: true,
  default: { create: vi.fn() },
}));

vi.mock('../../../src/services/payos.client', () => ({
  payos: {
    isConfigured: true,
    getPaymentLinkInformation: vi.fn(),
  },
}));

vi.mock('../../../src/services/mail.service', () => ({
  mailService: {
    sendPaymentSuccessNotification: vi.fn().mockResolvedValue(true),
  },
}));

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handlePayOSReturn', () => {
    it('updates order to paid and sends email when payos status is PAID', async () => {
      const mockOrder = { _id: 'order-id', orderCode: 123, status: OrderStatus.Pending, save: vi.fn() };
      (Order.findOne as any).mockResolvedValue(mockOrder);
      (payos.getPaymentLinkInformation as any).mockResolvedValue({ status: 'PAID' });
      (Order.findOneAndUpdate as any).mockResolvedValue({ ...mockOrder, amount: 10000 });
      (Tier.findById as any).mockResolvedValue({ _id: 'tier-id', title: 'Pro', amount: 10000, noMonth: 1 });
      const mockUser = { _id: 'user-id', email: 'test@example.com', userName: 'Test', save: vi.fn() };
      (User.findById as any).mockResolvedValue(mockUser);
      
      const { mailService } = require('../../../src/services/mail.service');

      const result = await PaymentService.handlePayOSReturn('user-id', { orderCode: 123, cancel: false });
      
      expect(result.resolvedStatus).toBe('PAID');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mailService.sendPaymentSuccessNotification).toHaveBeenCalled();
    });
  });
});
