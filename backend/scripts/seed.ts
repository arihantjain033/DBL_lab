/**
 * scripts/seed.ts — CLI Seed Script
 *
 * Usage:  npm run seed
 *
 * This script is idempotent — safe to run multiple times.
 * It will:
 *   1. Create the DBL 1st Anniversary campaign (if it doesn't exist)
 *   2. Generate exactly 101 shuffled coupons (if none exist yet)
 *   3. Print a summary table to the console
 */

import '../src/config/env.js';             // Loads .env and validates it
import { seedService, PRIZE_DISTRIBUTION } from '../src/services/seed.service.js';
import { closeDatabaseConnection } from '../src/db/index.js';

const LINE = '═'.repeat(60);

async function main() {
  console.log(`\n${LINE}`);
  console.log('  DBL Digital Campaign — Seed Script');
  console.log(`${LINE}\n`);

  try {
    const result = await seedService.run();

    // ---- Summary ----
    console.log(`  Campaign : ${result.campaignName}`);
    console.log(`  ID       : ${result.campaignId}`);
    console.log(`  Status   : ${result.campaignCreated ? '✅ CREATED' : '♻️  Already existed'}`);
    console.log();

    if (result.alreadySeeded) {
      console.log('  ⚠️  Coupons already exist for this campaign — skipped generation.');
      console.log(`     Run was a no-op. Database is unchanged.\n`);
    } else {
      console.log(`  Coupons Generated : ${result.couponsGenerated}`);
      console.log(`\n  Prize Distribution:`);
      console.log(`  ${'─'.repeat(52)}`);
      console.log(`  ${'Prize'.padEnd(38)} ${'Qty'.padStart(4)}`);
      console.log(`  ${'─'.repeat(52)}`);
      for (const { prize, quantity, condition } of result.prizeDistribution) {
        console.log(`  ${prize.padEnd(38)} ${String(quantity).padStart(4)}`);
        if (condition) {
          console.log(`    ↳ ${condition}`);
        }
      }
      const total = result.prizeDistribution.reduce((s, p) => s + p.quantity, 0);
      console.log(`  ${'─'.repeat(52)}`);
      console.log(`  ${'TOTAL'.padEnd(38)} ${String(total).padStart(4)}`);
      console.log(`  ${'─'.repeat(52)}`);
      console.log();
      console.log('  ✅ Seed completed successfully. Database is ready.');
    }

    console.log(`\n${LINE}\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n  ❌ Seed failed:\n');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

main();
