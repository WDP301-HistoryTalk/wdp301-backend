import User from '../models/user.model';
import Tier from '../models/tier.model';
import { TierTitle } from '../types/enums';
import { PushService } from './push.service';

export class SubscriptionService {
  /**
   * Downgrade every user whose paid subscription has lapsed.
   *
   * A user only has `tierExpiresAt` set when they bought a paid tier (see
   * PaymentService.applyPaidOrder), so `tierExpiresAt < now` uniquely identifies
   * lapsed paid subscribers — free-tier users are never matched.
   *
   * Downgrade = point them back at the free tier and clear the expiry. Existing
   * token balance is intentionally left untouched (the daily reset will then
   * top up using the free tier's limitedToken). Idempotent: safe to run repeatedly
   * and from multiple instances.
   *
   * @returns number of users downgraded
   */
  static async downgradeExpiredUsers(now: Date = new Date()): Promise<number> {
    const freeTier = await Tier.findOne({ title: TierTitle.Free });

    // Lay danh sach id TRUOC khi updateMany, de biet chinh xac ai vua bi ha
    // goi ma gui push (updateMany khong tra ve document da sua).
    const expiredUsers = await User.find({ tierExpiresAt: { $lt: now } }).select('_id');

    const update = freeTier
      ? { $set: { tierId: freeTier._id }, $unset: { tierExpiresAt: 1 } }
      : { $unset: { tierExpiresAt: 1, tierId: 1 } };

    const result = await User.updateMany({ tierExpiresAt: { $lt: now } }, update);

    for (const u of expiredUsers) {
      PushService.sendToUser(u._id.toString(), {
        title: 'Gói của bạn đã hết hạn',
        body: 'Gói dịch vụ đã hết hạn và được chuyển về gói Miễn phí. Gia hạn ngay để tiếp tục sử dụng đầy đủ tính năng.',
        data: { route: '/payment' },
      }).catch(console.error);
    }

    return result.modifiedCount ?? 0;
  }
}
