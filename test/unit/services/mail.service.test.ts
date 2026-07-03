import { vi, describe, it, expect, beforeEach } from 'vitest';
import nodemailer from 'nodemailer';

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue(true)
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    }),
  },
}));

import { mailService } from '../../../src/services/mail.service';
import { config } from '../../../src/config';

describe('MailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.mail.user = 'test@example.com';
    config.mail.pass = 'testpass';
  });

  it('should not send email if config is missing', async () => {
    config.mail.user = '';
    await mailService.sendMail('to@example.com', 'Subject', 'HTML');
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should send an email using transporter', async () => {
    await mailService.sendMail('to@example.com', 'Subject', 'HTML');
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'to@example.com',
      subject: 'Subject',
      html: 'HTML',
    }));
  });

  it('should send login notification with password', async () => {
    await mailService.sendLoginNotificationWithPassword('user@example.com', 'User', 'randompass123');
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      subject: expect.stringContaining('Đăng nhập thành công'),
      html: expect.stringContaining('randompass123'),
    }));
  });

  it('should send payment success notification', async () => {
    await mailService.sendPaymentSuccessNotification('user@example.com', 'User', 'Pro Tier', 100000);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      subject: expect.stringContaining('Thanh toán thành công'),
      html: expect.stringContaining('100.000'),
    }));
  });

  it('should send password reset email', async () => {
    await mailService.sendPasswordResetEmail('user@example.com', 'User', 'http://reset');
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      subject: expect.stringContaining('Đặt lại mật khẩu'),
      html: expect.stringContaining('http://reset'),
    }));
  });
});
