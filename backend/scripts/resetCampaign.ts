import { getDb, closeDatabaseConnection, schema } from '../src/db/index.js';
import { eq, inArray } from 'drizzle-orm';
import { seedService } from '../src/services/seed.service.js';

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
      console.log('Clearing old data (claims, users, coupons)...');

      // 2. Delete ALL claims
      await tx.delete(claims).where(
        inArray(
          claims.couponId,
          tx.select({ id: coupons.id }).from(coupons).where(eq(coupons.campaignId, campaign.id)),
        ),
      );

      // 3. Delete ALL users
      await tx.delete(users).where(eq(users.campaignId, campaign.id));

      // 4. Delete ALL coupons
      await tx.delete(coupons).where(eq(coupons.campaignId, campaign.id));
    });

    console.log('Old data cleared successfully. Generating new dataset...');

    // 5. Generate new dataset
    await seedService.run();

    console.log('\n========================================');
    console.log('Campaign Reset Complete');
    console.log('========================================');
    console.log('Coupons Generated: 131\n');
    console.log('Prize Distribution:');
    console.log('Free Full Body Health Check-up : 1');
    console.log('Digital Thermometer : 10');
    console.log('50% OFF Blood Test : 20');
    console.log('10% Discount : 20');
    console.log('20% Discount : 20');
    console.log('30% Discount : 20');
    console.log('40% Discount : 20');
    console.log('Free Blood Sugar Test : 20');
    console.log('\nTOTAL : 131');
    console.log('========================================\n');
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
