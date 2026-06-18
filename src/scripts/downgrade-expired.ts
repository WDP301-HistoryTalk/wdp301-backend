import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SubscriptionService } from '../services/subscription.service';

/**
 * One-shot job: downgrade users whose paid subscription has expired.
 * Intended for an external scheduler (system cron / platform scheduler):
 *
 *   npm run subscriptions:downgrade
 *
 * The in-process scheduler (src/utils/scheduler.ts) already does this hourly when
 * the server runs; this script is for running it standalone / on demand.
 */
async function main() {
  await mongoose.connect(config.mongoUri);
  try {
    const count = await SubscriptionService.downgradeExpiredUsers();
    logger.info(`Downgraded ${count} expired subscription(s) to free tier.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  logger.error('downgrade-expired failed', err);
  process.exit(1);
});
