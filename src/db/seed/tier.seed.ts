import Tier from '../../models/tier.model';
import { TierTitle } from '../../types/enums';
import { logger } from '../../utils/logger';

const TIERS = [
  { title: TierTitle.Free, amount: 0, limitedToken: 10 },
  { title: TierTitle.Plus, amount: 99000, limitedToken: 100 },
  { title: TierTitle.Pro, amount: 299000, limitedToken: 500 },
];

export async function seedTiers() {
  for (const tier of TIERS) {
    const exists = await Tier.findOne({ title: tier.title });
    if (!exists) {
      await Tier.create(tier);
      logger.info(`Seeded tier: ${tier.title}`);
    }
  }
}
