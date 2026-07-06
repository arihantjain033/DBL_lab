import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import bcrypt from 'bcryptjs';

const { admins } = schema;

export const adminRepository = {
  async findByEmail(email: string) {
    const db = getDb();
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);
    return admin ?? null;
  },

  async findById(id: string) {
    const db = getDb();
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);
    return admin ?? null;
  },

  async create(data: { name: string; email: string; password: string; role?: 'superadmin' | 'admin' | 'receptionist' }) {
    const db = getDb();
    const passwordHash = await bcrypt.hash(data.password, 12);
    const [admin] = await db
      .insert(admins)
      .values({
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role ?? 'receptionist',
      })
      .returning();
    return admin;
  },

  async listAll() {
    const db = getDb();
    return db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        role: admins.role,
        createdAt: admins.createdAt,
      })
      .from(admins);
  },

  async verifyPassword(passwordHash: string, password: string) {
    return bcrypt.compare(password, passwordHash);
  },
};
