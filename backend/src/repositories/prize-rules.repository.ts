import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';

const { prizeRules } = schema;

export const prizeRulesRepository = {
  async findAll() {
    const db = getDb();
    return db.select().from(prizeRules).orderBy(prizeRules.prizeName);
  },
  
  async findByPrize(prizeName: string) {
    const db = getDb();
    const [rule] = await db.select().from(prizeRules).where(eq(prizeRules.prizeName, prizeName)).limit(1);
    return rule ?? null;
  },
  
  async upsert(data: { prizeName: string; minimumBilling?: number | null; nextVisitOnly?: boolean; showMinimumBilling?: boolean; terms?: string | null }) {
    const db = getDb();
    const [rule] = await db
      .insert(prizeRules)
      .values({
        prizeName: data.prizeName,
        minimumBilling: data.minimumBilling ?? null,
        nextVisitOnly: data.nextVisitOnly ?? false,
        showMinimumBilling: data.showMinimumBilling ?? false,
        terms: data.terms ?? null,
      })
      .onConflictDoUpdate({
        target: prizeRules.prizeName,
        set: {
          minimumBilling: data.minimumBilling ?? null,
          nextVisitOnly: data.nextVisitOnly ?? false,
          showMinimumBilling: data.showMinimumBilling ?? false,
          terms: data.terms ?? null,
        },
      })
      .returning();
    return rule;
  },
  
  async delete(id: string) {
    const db = getDb();
    await db.delete(prizeRules).where(eq(prizeRules.id, id));
  }
};
