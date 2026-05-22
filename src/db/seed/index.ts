import { seedTiers } from './tier.seed';
import { seedAdmin } from './admin.seed';

export async function runAllSeeds() {
  await seedTiers();
  await seedAdmin();
}
