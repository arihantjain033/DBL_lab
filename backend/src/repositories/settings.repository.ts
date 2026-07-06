import { getDb, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const { settings } = schema;

const DEFAULTS: Array<typeof settings.$inferInsert> = [
  { key: 'scratch_enabled', value: 'true', description: 'Allow users to scratch cards' },
  { key: 'otp_enabled', value: 'false', description: 'Require OTP verification' },
  { key: 'max_attempts_per_phone', value: '1', description: 'Max scratch attempts per phone per campaign' },
  { key: 'recaptcha_enabled', value: 'false', description: 'Enable Google reCAPTCHA' },
  { key: 'campaign_active', value: 'true', description: 'Master switch for campaign' },
];

export const settingsRepository = {
  async get(key: string): Promise<string | null> {
    const db = getDb();
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    return setting?.value ?? null;
  },

  async set(key: string, value: string) {
    const db = getDb();
    await db
      .insert(settings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      });
  },

  async getAll() {
    const db = getDb();
    return db.select().from(settings);
  },

  async seedDefaults() {
    const db = getDb();
    for (const setting of DEFAULTS) {
      await db
        .insert(settings)
        .values(setting)
        .onConflictDoNothing();
    }
  },
};
