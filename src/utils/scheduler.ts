import { SubscriptionService } from '../services/subscription.service';
import { PushService } from '../services/push.service';
import DeviceToken from '../models/device-token.model';
import User from '../models/user.model';
import { logger } from './logger';

const HOUR = 60 * 60 * 1000;
const REMINDER_HOUR_VN = 20; // 20:00 gio Viet Nam (UTC+7)
let lastReminderSentDateKey: string | null = null;

async function runDowngradeExpired(): Promise<void> {
  try {
    const count = await SubscriptionService.downgradeExpiredUsers();
    if (count > 0) {
      logger.info(`[scheduler] Downgraded ${count} expired subscription(s) to free tier`);
    }
  } catch (err) {
    logger.error('[scheduler] downgradeExpiredUsers failed', err);
  }
}

// Quy doi ve gio Viet Nam (UTC+7) khong phu thuoc timezone cua may chay server.
function toVnDate(date: Date): Date {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}

async function runDailyStudyReminder(): Promise<void> {
  try {
    const now = new Date();
    const vnNow = toVnDate(now);
    if (vnNow.getUTCHours() !== REMINDER_HOUR_VN) return;

    const todayKey = vnNow.toISOString().slice(0, 10); // YYYY-MM-DD
    if (lastReminderSentDateKey === todayKey) return;
    lastReminderSentDateKey = todayKey;

    const startOfTodayVN = new Date(`${todayKey}T00:00:00+07:00`);

    const uidsWithToken = await DeviceToken.distinct('uid');
    if (uidsWithToken.length === 0) return;

    const inactiveUsers = await User.find({
      _id: { $in: uidsWithToken },
      $or: [{ lastActiveDate: { $lt: startOfTodayVN } }, { lastActiveDate: { $exists: false } }],
    }).select('_id');

    for (const u of inactiveUsers) {
      PushService.sendToUser(u._id.toString(), {
        title: 'Đừng bỏ lỡ chuỗi ngày học! 🔥',
        body: 'Hôm nay bạn chưa ghé HistoryTalk — vào học ngay để giữ chuỗi ngày học nhé.',
        data: { route: '/' },
      }).catch(console.error);
    }

    if (inactiveUsers.length > 0) {
      logger.info(`[scheduler] Sent daily study reminder push to ${inactiveUsers.length} user(s)`);
    }
  } catch (err) {
    logger.error('[scheduler] runDailyStudyReminder failed', err);
  }
}

/**
 * Start lightweight in-process background jobs. Dependency-free (plain setInterval),
 * consistent with this project's "no extra deps" approach. The work is idempotent,
 * so running it on several instances is harmless. For a single authoritative run
 * instead, use the `npm run subscriptions:downgrade` script from an external cron.
 *
 * No-ops in the test environment.
 */
export function startSchedulers(): void {
  if (process.env.NODE_ENV === 'test') return;

  // Sweep once shortly after boot, then hourly.
  setTimeout(runDowngradeExpired, 10_000).unref();
  setInterval(runDowngradeExpired, HOUR).unref();

  setTimeout(runDailyStudyReminder, 15_000).unref();
  setInterval(runDailyStudyReminder, HOUR).unref();

  logger.info('[scheduler] Background jobs started (expired-subscription downgrade: hourly, daily study reminder: hourly check)');
}
