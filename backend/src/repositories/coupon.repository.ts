import { eq, and, sql } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';

const { coupons, claims, users } = schema;

export const couponRepository = {
  /**
   * Atomically assign one available coupon to a user.
   * Uses a FOR UPDATE SKIP LOCKED pattern to prevent race conditions.
   */
  async assignCoupon(userId: string, campaignId: string) {
    const db = getDb();

    // Use raw SQL transaction for maximum safety
    const result = await db.transaction(async (tx) => {
      // Lock and select one available coupon (skip locked rows for concurrent safety)
      const [available] = await tx
        .select({ id: coupons.id })
        .from(coupons)
        .where(and(eq(coupons.campaignId, campaignId), eq(coupons.status, 'available')))
        .orderBy(sql`RANDOM()`)
        .limit(1)
        .for('update', { skipLocked: true });

      if (!available) {
        return null; // No coupons left
      }

      // Compute expiry: assigned_at + 6 months (independent per user)
      const now = new Date();
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + 6);

      // Update the coupon atomically within the same transaction
      const [updated] = await tx
        .update(coupons)
        .set({
          status: 'assigned',
          assignedTo: userId,
          assignedAt: now,
          expiryDate: expiry,   // ← each user gets their own 6-month window
        })
        .where(
          and(eq(coupons.id, available.id), eq(coupons.status, 'available')),
        )
        .returning();

      return updated ?? null;
    });

    return result;
  },

  async findByCouponNo(couponNo: string) {
    const db = getDb();
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.couponNo, couponNo))
      .limit(1);
    return coupon ?? null;
  },

  async findById(id: string) {
    const db = getDb();
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);
    return coupon ?? null;
  },

  async findByUserId(userId: string) {
    const db = getDb();
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.assignedTo, userId))
      .limit(1);
    return coupon ?? null;
  },

  async redeem(id: string) {
    const db = getDb();
    const [coupon] = await db
      .update(coupons)
      .set({ status: 'redeemed', redeemed: true, redeemedAt: new Date() })
      .where(and(eq(coupons.id, id), eq(coupons.redeemed, false)))
      .returning();
    return coupon ?? null;
  },

  async bulkInsert(records: Array<typeof coupons.$inferInsert>) {
    const db = getDb();
    // Insert in batches of 500 to avoid query size limits
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.insert(coupons).values(batch);
    }
  },

  async countByCampaign(campaignId: string) {
    const db = getDb();
    const rows = await db
      .select({
        status: coupons.status,
        count: sql<number>`count(*)::int`,
      })
      .from(coupons)
      .where(eq(coupons.campaignId, campaignId))
      .groupBy(coupons.status);

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
  },

  /**
   * List coupons for a campaign with full user details joined in.
   * Returns: coupon fields + user_name, user_phone, user_city, user_email.
   */
  async listByCampaign(
    campaignId: string,
    offset: number,
    limit: number,
    status?: string,
  ) {
    const db = getDb();
    const conditions = [eq(coupons.campaignId, campaignId)];
    if (status) {
      conditions.push(
        eq(coupons.status, status as 'available' | 'assigned' | 'redeemed' | 'expired'),
      );
    }

    const rows = await db
      .select({
        // Coupon fields
        id:          coupons.id,
        couponNo:    coupons.couponNo,
        prize:       coupons.prize,
        status:      coupons.status,
        redeemed:    coupons.redeemed,
        assignedAt:  coupons.assignedAt,
        redeemedAt:  coupons.redeemedAt,
        expiryDate:  coupons.expiryDate,
        campaignId:  coupons.campaignId,
        createdAt:   coupons.createdAt,
        // User fields (null when available)
        userName:    users.name,
        userPhone:   users.phone,
        userEmail:   users.email,
        userCity:    users.city,
      })
      .from(coupons)
      .leftJoin(users, eq(coupons.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(coupons.couponNo)
      .limit(limit)
      .offset(offset);

    return rows;
  },

  /** Total coupon count for a campaign (for pagination) */
  async countTotalByCampaign(campaignId: string, status?: string) {
    const db = getDb();
    const conditions = [eq(coupons.campaignId, campaignId)];
    if (status) {
      conditions.push(
        eq(coupons.status, status as 'available' | 'assigned' | 'redeemed' | 'expired'),
      );
    }
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(coupons)
      .where(and(...conditions));
    return row?.count ?? 0;
  },

  async getPrizeBreakdown(campaignId: string) {
    const db = getDb();
    return db
      .select({
        prize: coupons.prize,
        total: sql<number>`count(*)::int`,
        assigned: sql<number>`sum(case when ${coupons.status} != 'available' then 1 else 0 end)::int`,
      })
      .from(coupons)
      .where(eq(coupons.campaignId, campaignId))
      .groupBy(coupons.prize)
      .orderBy(sql`count(*) DESC`);
  },
};

export const claimRepository = {
  async create(data: {
    userId: string;
    couponId: string;
    ip?: string;
    device?: string;
    browser?: string;
  }) {
    const db = getDb();
    const [claim] = await db
      .insert(claims)
      .values({
        userId: data.userId,
        couponId: data.couponId,
        ip: data.ip ?? null,
        device: data.device ?? null,
        browser: data.browser ?? null,
      })
      .returning();
    return claim;
  },

  async findByUserId(userId: string) {
    const db = getDb();
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.userId, userId))
      .limit(1);
    return claim ?? null;
  },

  async countByCampaignToday(campaignId: string) {
    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(claims)
      .innerJoin(coupons, eq(claims.couponId, coupons.id))
      .where(
        and(
          eq(coupons.campaignId, campaignId),
          sql`DATE(${claims.createdAt}) = CURRENT_DATE`,
        ),
      );
    return result?.count ?? 0;
  },
};
