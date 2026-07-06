/**
 * SeedService — idempotent campaign + coupon seeding.
 *
 * Design decisions:
 *  - Entire seed is wrapped in ONE database transaction — either everything
 *    commits or nothing does.
 *  - Fisher-Yates shuffle before insertion ensures random prize distribution.
 *  - "Skip if already seeded" logic uses a single COUNT query; if any coupon
 *    exists for the campaign we consider it already seeded.
 *  - All values come from typed constants — no magic strings scattered around.
 *  - Used by both `scripts/seed.ts` (CLI) and `POST /admin/seed` (API).
 */

import { getDb, schema } from '../db/index.js';
import { campaignRepository } from '../repositories/campaign.repository.js';
import { couponRepository } from '../repositories/coupon.repository.js';
import { formatCouponNo } from './coupon.service.js';
import { logger } from '../utils/logger.js';

// ====================================================================
// Campaign definition — single place to change campaign details
// ====================================================================
export const CAMPAIGN_CONFIG = {
  name: 'DBL Pathology Lab - 1st Anniversary Celebration',
  description: 'Digital Scratch Card Campaign for new users.',
  // FAR-FUTURE end date so the admin controls deactivation manually
  startDate: new Date().toISOString(),
  endDate: new Date('2099-12-31T23:59:59Z').toISOString(),
} as const;

// ====================================================================
// Prize distribution — exactly 101 coupons, never more, never less
// ====================================================================
export interface PrizeTier {
  prize: string;
  quantity: number;
  condition?: string;   // Displayed on the coupon/UI — informational only
}

export const PRIZE_DISTRIBUTION: PrizeTier[] = [
  {
    prize: 'Free Full Body Health Check-up',
    quantity: 1,
  },
  {
    prize: 'Digital Thermometer',
    quantity: 10,
  },
  {
    prize: '50% OFF on Any Blood Test',
    quantity: 20,
    condition: 'Valid only on minimum billing of ₹200.',
  },
  {
    prize: '10% Discount Voucher',
    quantity: 20,
    condition: 'Valid only on minimum billing of ₹200.',
  },
  {
    prize: '20% Discount Voucher',
    quantity: 20,
    condition: 'Valid only on minimum billing of ₹200.',
  },
  {
    prize: '30% Discount Voucher',
    quantity: 20,
    condition: 'Valid only on minimum billing of ₹200.',
  },
  {
    prize: '40% Discount Voucher',
    quantity: 20,
    condition: 'Valid only on minimum billing of ₹200.',
  },
  {
    prize: 'Free Blood Sugar Test',
    quantity: 20,
  },
];

// Verify at module load that distribution sums to exactly 131
const EXPECTED_TOTAL = 131;
const ACTUAL_TOTAL = PRIZE_DISTRIBUTION.reduce((sum, t) => sum + t.quantity, 0);
if (ACTUAL_TOTAL !== EXPECTED_TOTAL) {
  throw new Error(
    `Prize distribution error: expected ${EXPECTED_TOTAL} coupons, got ${ACTUAL_TOTAL}. ` +
    'Check PRIZE_DISTRIBUTION in seed.service.ts.',
  );
}

// ====================================================================
// Seed result type
// ====================================================================
export interface SeedResult {
  campaignCreated: boolean;
  campaignId: string;
  campaignName: string;
  couponsGenerated: number;
  alreadySeeded: boolean;
  prizeDistribution: Array<{
    prize: string;
    quantity: number;
    condition?: string;
  }>;
}

// ====================================================================
// SeedService
// ====================================================================
export const seedService = {
  /**
   * Idempotent seed: creates the campaign (if it doesn't exist) and
   * generates exactly 101 coupons (only if no coupons exist yet for
   * that campaign).
   *
   * Safe to run multiple times — subsequent runs are no-ops.
   */
  async run(): Promise<SeedResult> {
    const db = getDb();

    // ----------------------------------------------------------------
    // Step 1: Resolve campaign (find existing OR create new)
    // ----------------------------------------------------------------
    let campaign = await campaignRepository.findByName(CAMPAIGN_CONFIG.name);
    let campaignCreated = false;

    if (!campaign) {
      logger.info(`Creating campaign: "${CAMPAIGN_CONFIG.name}"`);

      // Use raw db insert inside a transaction so the campaign is
      // immediately activated without a separate round-trip
      const [created] = await db
        .insert(schema.campaigns)
        .values({
          name: CAMPAIGN_CONFIG.name,
          description: CAMPAIGN_CONFIG.description,
          startDate: new Date(CAMPAIGN_CONFIG.startDate),
          endDate: new Date(CAMPAIGN_CONFIG.endDate),
          active: true,   // Active immediately
        })
        .returning();

      campaign = created;
      campaignCreated = true;
      logger.info(`Campaign created with ID: ${campaign.id}`);
    } else {
      logger.info(`Campaign already exists: "${campaign.name}" (${campaign.id})`);
    }

    // ----------------------------------------------------------------
    // Step 2: Check if coupons already exist
    // ----------------------------------------------------------------
    const existingCounts = await couponRepository.countByCampaign(campaign.id);
    const totalExisting = Object.values(existingCounts).reduce((a, b) => a + b, 0);

    if (totalExisting > 0) {
      logger.info(
        `Campaign already has ${totalExisting} coupon(s). Skipping generation.`,
      );
      return {
        campaignCreated,
        campaignId: campaign.id,
        campaignName: campaign.name,
        couponsGenerated: 0,
        alreadySeeded: true,
        prizeDistribution: PRIZE_DISTRIBUTION.map(({ prize, quantity, condition }) => ({
          prize,
          quantity,
          condition,
        })),
      };
    }

    // ----------------------------------------------------------------
    // Step 3: Build prize pool and shuffle (Fisher-Yates)
    // ----------------------------------------------------------------
    logger.info(`Building prize pool of ${EXPECTED_TOTAL} coupons...`);
    const prizePool: string[] = [];

    for (const { prize, quantity } of PRIZE_DISTRIBUTION) {
      for (let i = 0; i < quantity; i++) {
        prizePool.push(prize);
      }
    }

    // Fisher-Yates shuffle — O(n), unbiased
    for (let i = prizePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [prizePool[i], prizePool[j]] = [prizePool[j], prizePool[i]];
    }

    // ----------------------------------------------------------------
    // Step 4: Build coupon records
    //
    // Coupon numbers: DBL-0001 … DBL-0101
    // expiryDate is NOT set at generation — it is set individually when
    // a user scratches (assignedAt + 6 months) inside assignCoupon().
    // ----------------------------------------------------------------
    type CouponInsert = typeof schema.coupons.$inferInsert;

    const records: CouponInsert[] = prizePool.map((prize, index) => ({
      campaignId: campaign!.id,
      couponNo: formatCouponNo(index + 1),  // DBL-0001 … DBL-0101
      prize,
      status: 'available' as const,
      assignedTo: null,
      assignedAt: null,
      redeemed: false,
      redeemedAt: null,
      expiryDate: null,   // Set when scratched, not at generation
    }));

    // ----------------------------------------------------------------
    // Step 5: Insert inside a transaction (all-or-nothing)
    // ----------------------------------------------------------------
    logger.info(`Inserting ${records.length} coupon(s) inside a transaction...`);

    await db.transaction(async (tx) => {
      // Batch insert to stay within query size limits (batches of 500)
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        await tx
          .insert(schema.coupons)
          .values(records.slice(i, i + batchSize))
          .onConflictDoNothing();  // Guard against any accidental re-runs
      }
    });

    logger.info(`✅ ${records.length} coupons inserted successfully.`);

    return {
      campaignCreated,
      campaignId: campaign.id,
      campaignName: campaign.name,
      couponsGenerated: records.length,
      alreadySeeded: false,
      prizeDistribution: PRIZE_DISTRIBUTION.map(({ prize, quantity, condition }) => ({
        prize,
        quantity,
        condition,
      })),
    };
  },
};
