import type { Db } from 'mongodb';
import { TierTitle } from '../../types/enums';

// 001_init-tiers-and-admin.ts inserted tier docs via the raw driver, bypassing
// Mongoose — so schema defaults (isActive) and required fields (noMonth) were
// never written. listTiers() filters on isActive:true, so those tiers were
// invisible to GET /tiers even though findById still worked.
const NO_MONTH: Record<string, number> = {
  [TierTitle.Free]: 1,
  [TierTitle.Plus]: 1,
  [TierTitle.Pro]: 1,
};

export async function up(db: Db): Promise<void> {
  for (const title of Object.values(TierTitle)) {
    await db.collection('tiers').updateOne(
      { title },
      {
        $set: { isActive: true },
        $setOnInsert: { noMonth: NO_MONTH[title] },
      }
    );
    // $setOnInsert only applies on insert; backfill noMonth separately if missing.
    await db.collection('tiers').updateOne(
      { title, noMonth: { $exists: false } },
      { $set: { noMonth: NO_MONTH[title] } }
    );
  }
}

export async function down(_db: Db): Promise<void> {
  // No-op: backfilling defaults isn't meaningfully reversible.
}
