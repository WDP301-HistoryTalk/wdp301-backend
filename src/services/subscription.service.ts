import User from '../models/user.model';
import Tier from '../models/tier.model';
import { TierTitle } from '../types/enums';

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

    const update = freeTier
      ? { $set: { tierId: freeTier._id }, $unset: { tierExpiresAt: 1 } }
      : { $unset: { tierExpiresAt: 1, tierId: 1 } };

    const result = await User.updateMany({ tierExpiresAt: { $lt: now } }, update);
    return result.modifiedCount ?? 0;
  }
}
