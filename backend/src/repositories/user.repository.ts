import { eq, and, sql } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { RegisterUserInput } from '../validators/index.js';

const { users } = schema;

export const userRepository = {
  async create(data: RegisterUserInput) {
    const db = getDb();
    const [user] = await db
      .insert(users)
      .values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        city: data.city || null,
        campaignId: data.campaignId,
      })
      .returning();
    return user;
  },

  async findByPhoneAndCampaign(phone: string, campaignId: string) {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), eq(users.campaignId, campaignId)))
      .limit(1);
    return user ?? null;
  },

  async findById(id: string) {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },

  async countByCampaign(campaignId: string) {
    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.campaignId, campaignId));
    return result?.count ?? 0;
  },

  async countTodayByCampaign(campaignId: string) {
    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.campaignId, campaignId),
          sql`DATE(${users.createdAt}) = CURRENT_DATE`,
        ),
      );
    return result?.count ?? 0;
  },

  async listByCampaign(campaignId: string, offset: number, limit: number) {
    const db = getDb();
    return db
      .select()
      .from(users)
      .where(eq(users.campaignId, campaignId))
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  },

  /**
   * List participants with their coupon details joined.
   * Used by the Admin Participants page so admins see full picture.
   */
  async listByCampaignWithCoupon(campaignId: string, offset: number, limit: number) {
    const db = getDb();
    const { coupons } = schema;

    return db
      .select({
        // User fields
        userId:      users.id,
        userName:    users.name,
        userPhone:   users.phone,
        userEmail:   users.email,
        userCity:    users.city,
        registeredAt: users.createdAt,
        // Coupon fields (null if not yet scratched)
        couponId:    coupons.id,
        couponNo:    coupons.couponNo,
        prize:       coupons.prize,
        status:      coupons.status,
        redeemed:    coupons.redeemed,
        assignedAt:  coupons.assignedAt,
        redeemedAt:  coupons.redeemedAt,
        expiryDate:  coupons.expiryDate,
      })
      .from(users)
      .leftJoin(coupons, eq(coupons.assignedTo, users.id))
      .where(eq(users.campaignId, campaignId))
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  },
};
