/**
 * scripts/appendCoupons.ts — Appends new discount coupons to existing campaign
 *
 * Usage: npm run tsx scripts/appendCoupons.ts
 */

import '../src/config/env.js';
import { getDb, schema } from '../src/db/index.js';
import { campaignRepository } from '../src/repositories/campaign.repository.js';
import { couponRepository } from '../src/repositories/coupon.repository.js';
import { formatCouponNo } from '../src/services/coupon.service.js';
import { logger } from '../src/utils/logger.js';
import { sql } from 'drizzle-orm';

const NEW_PRIZES = [
  { prize: '45% OFF on Any Blood Test', quantity: 20 },
  { prize: '15% Discount Voucher', quantity: 20 },
  { prize: '25% Discount Voucher', quantity: 20 },
  { prize: '35% Discount Voucher', quantity: 20 },
];

async function main() {
  console.log('Appnding new coupons...');
  
  try {
    const db = getDb();
    
    // Get active campaign
    const campaign = await campaignRepository.findByName('DBL Pathology Lab - 1st Anniversary Celebration');
    if (!campaign) {
      throw new Error('Campaign not found.');
    }

    // Get current total existing coupons
    const existingCounts = await couponRepository.countByCampaign(campaign.id);
    const totalExisting = Object.values(existingCounts).reduce((a, b) => a + b, 0);

    console.log(`Current total existing coupons: ${totalExisting}`);
    
    // Check if we already appended them (to avoid duplicates if script is run twice by mistake)
    if (totalExisting >= 131 + 80) { // 131 initial + 80 new = 211
        console.log('Coupons already appended. Total coupons >= 211.');
        process.exit(0);
    }

    const prizePool: string[] = [];
    for (const { prize, quantity } of NEW_PRIZES) {
      for (let i = 0; i < quantity; i++) {
        prizePool.push(prize);
      }
    }

    // Fisher-Yates shuffle
    for (let i = prizePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [prizePool[i], prizePool[j]] = [prizePool[j], prizePool[i]];
    }

    type CouponInsert = typeof schema.coupons.$inferInsert;

    const records: CouponInsert[] = prizePool.map((prize, index) => ({
      campaignId: campaign.id,
      couponNo: formatCouponNo(totalExisting + index + 1),
      prize,
      status: 'available' as const,
      assignedTo: null,
      assignedAt: null,
      redeemed: false,
      redeemedAt: null,
      expiryDate: null,
    }));

    console.log(`Inserting ${records.length} new coupons...`);

    await db.transaction(async (tx) => {
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        await tx
          .insert(schema.coupons)
          .values(records.slice(i, i + batchSize))
          .onConflictDoNothing();
      }
    });

    console.log('Successfully inserted new coupons.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
