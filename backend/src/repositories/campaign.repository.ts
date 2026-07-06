import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { CreateCampaignInput, UpdateCampaignInput } from '../validators/index.js';

const { campaigns } = schema;

export const campaignRepository = {
  async create(data: CreateCampaignInput) {
    const db = getDb();
    const [campaign] = await db
      .insert(campaigns)
      .values({
        name: data.name,
        description: data.description ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        active: false,
      })
      .returning();
    return campaign;
  },

  async findById(id: string) {
    const db = getDb();
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    return campaign ?? null;
  },

  async findActive() {
    const db = getDb();
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.active, true))
      .limit(1);
    return campaign ?? null;
  },

  async findByName(name: string) {
    const db = getDb();
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.name, name))
      .limit(1);
    return campaign ?? null;
  },

  async listAll() {
    const db = getDb();
    return db.select().from(campaigns).orderBy(sql`${campaigns.createdAt} DESC`);
  },

  async update(id: string, data: UpdateCampaignInput) {
    const db = getDb();
    const updateData: Partial<typeof campaigns.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.active !== undefined) updateData.active = data.active;

    const [campaign] = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign ?? null;
  },

  async deactivateAll() {
    const db = getDb();
    await db.update(campaigns).set({ active: false });
  },

  async setActive(id: string, active: boolean) {
    const db = getDb();
    const [campaign] = await db
      .update(campaigns)
      .set({ active })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign ?? null;
  },

  async delete(id: string) {
    const db = getDb();
    const [deleted] = await db
      .delete(campaigns)
      .where(eq(campaigns.id, id))
      .returning();
    return deleted ?? null;
  },
};
