import nodemailer from 'nodemailer';
import { config } from '../config';

class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465, // true for 465, false for other ports
      auth: {
        user: config.mail.user,
        pass: config.mail.pass,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    if (!config.mail.user || !config.mail.pass) {
      console.warn('Mail config missing. Skipping sending email to', to);
      return;
    }
    
    try {
      await this.transporter.sendMail({
        from: config.mail.from,
        to,
        subject,
        html,
      });
      console.log(`Mail sent to ${to} successfully`);
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
    }
  }

  async sendLoginNotificationWithPassword(to: string, userName: string, randomPassword: string) {
    const subject = 'Chào mừng bạn đến với HistoryTalk - Đăng nhập thành công';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h3>Chào ${userName},</h3>
        <p>Bạn đã đăng nhập / đăng ký thành công vào hệ thống HistoryTalk bằng Google.</p>
        <p>Để thuận tiện cho việc đăng nhập lần sau bằng email, chúng tôi đã tạo một mật khẩu tự động cho tài khoản của bạn.</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;">Mật khẩu của bạn là: <strong style="font-size: 18px;">${randomPassword}</strong></p>
        </div>
        <p>Vui lòng đổi mật khẩu sau khi đăng nhập để đảm bảo an toàn.</p>
        <br>
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ HistoryTalk</strong></p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }

  async sendPaymentSuccessNotification(to: string, userName: string, tierName: string, amount: number) {
    const subject = 'Thanh toán thành công - HistoryTalk';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h3>Chào ${userName},</h3>
        <p>Chúng tôi xin thông báo bạn đã thanh toán thành công!</p>
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4caf50;">
          <p style="margin: 5px 0;">Gói dịch vụ: <strong>${tierName}</strong></p>
          <p style="margin: 5px 0;">Số tiền: <strong>${amount.toLocaleString('vi-VN')} VND</strong></p>
        </div>
        <p>Cảm ơn bạn đã sử dụng dịch vụ của HistoryTalk. Các tính năng của gói đã được kích hoạt thành công.</p>
        <br>
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ HistoryTalk</strong></p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, userName: string, resetUrl: string) {
    const subject = 'Đặt lại mật khẩu - HistoryTalk';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h3>Chào ${userName},</h3>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng click vào nút bên dưới để tiến hành đặt lại mật khẩu mới:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Đặt Lại Mật Khẩu</a>
        </div>
        <p>Hoặc bạn có thể copy và dán đường dẫn này vào trình duyệt:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p><em>Lưu ý: Đường dẫn này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này.</em></p>
        <br>
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ HistoryTalk</strong></p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }
}

export const mailService = new MailService();
