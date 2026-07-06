import { getDb, closeDatabaseConnection, schema } from '../src/db/index.js';
import { eq, inArray, sql } from 'drizzle-orm';

const { campaigns, coupons, users, claims } = schema;

async function runReset() {
  const db = getDb();

  try {
    console.log('Initiating database reset transaction...');

    await db.transaction(async (tx) => {
      // 1. Get the active campaign
      const activeCampaigns = await tx
        .select()
        .from(campaigns)
        .where(eq(campaigns.active, true))
        .limit(1);

      if (activeCampaigns.length === 0) {
        throw new Error('No active campaign found to reset.');
      }

      const campaign = activeCampaigns[0];
      console.log(`\nFound active campaign: ${campaign.name}`);

      // Get stats before reset
      const [userCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.campaignId, campaign.id));

      const [claimCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(claims)
        .where(
          inArray(
            claims.couponId,
            tx.select({ id: coupons.id }).from(coupons).where(eq(coupons.campaignId, campaign.id)),
          ),
        );

      const [redeemedCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(sql`${coupons.campaignId} = ${campaign.id} AND ${coupons.status} != 'available'`);

      const [totalCoupons] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(eq(coupons.campaignId, campaign.id));

      console.log('Clearing test data...');

      // 2. Delete test claims/history
      await tx.delete(claims).where(
        inArray(
          claims.couponId,
          tx.select({ id: coupons.id }).from(coupons).where(eq(coupons.campaignId, campaign.id)),
        ),
      );

      // 3. Reset every coupon to AVAILABLE
      // We must do this before deleting users due to foreign key constraints if they are restricted
      await tx
        .update(coupons)
        .set({
          status: 'available',
          assignedTo: null,
          assignedAt: null,
          redeemed: false,
          redeemedAt: null,
          expiryDate: null,
        })
        .where(eq(coupons.campaignId, campaign.id));

      // 4. Delete test users
      await tx.delete(users).where(eq(users.campaignId, campaign.id));

      // Print summary
      console.log('\n========================================');
      console.log('Campaign Reset Complete');
      console.log('========================================');
      console.log(`Campaign:\n${campaign.name}\n`);
      console.log(`Coupons Reset:\n${totalCoupons.count}\n`);
      console.log(`Users Removed:\n${userCount?.count || 0}\n`);
      console.log(`Claims Removed:\n${claimCount?.count || 0}\n`);
      console.log(`Redeemed Coupons Reset:\n${redeemedCount?.count || 0}\n`);
      console.log('Status:\nREADY FOR TESTING');
      console.log('========================================\n');
    });
  } catch (error) {
    console.error('\n❌ Reset Failed. Transaction rolled back.');
    console.error(error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

// Execute
runReset().catch((err) => {
  console.error(err);
  process.exit(1);
});
