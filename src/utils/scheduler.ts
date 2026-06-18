import { SubscriptionService } from '../services/subscription.service';
import { logger } from './logger';

const HOUR = 60 * 60 * 1000;

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

  logger.info('[scheduler] Background jobs started (expired-subscription downgrade: hourly)');
}
