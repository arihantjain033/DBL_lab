import { pgTable, text, boolean, timestamp, uuid, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';

// ---- Enums ----
export const couponStatusEnum = pgEnum('coupon_status', [
  'available',
  'assigned',
  'redeemed',
  'expired',
]);

export const adminRoleEnum = pgEnum('admin_role', [
  'superadmin',
  'admin',
  'receptionist',
]);

// ====================================================================
// CAMPAIGNS
// ====================================================================
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  active: boolean('active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ====================================================================
// USERS — Campaign participants
// ====================================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  city: text('city'),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ====================================================================
// COUPONS — Most critical table
// ====================================================================
export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'restrict' }),
  couponNo: text('coupon_no').notNull().unique(),
  prize: text('prize').notNull(),
  status: couponStatusEnum('status').notNull().default('available'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  redeemed: boolean('redeemed').notNull().default(false),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ====================================================================
// CLAIMS — Scratch history (immutable audit log)
// ====================================================================
export const claims = pgTable('claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  couponId: uuid('coupon_id')
    .notNull()
    .references(() => coupons.id, { onDelete: 'restrict' }),
  ip: text('ip'),
  device: text('device'),
  browser: text('browser'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ====================================================================
// ADMINS
// ====================================================================
export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: adminRoleEnum('role').notNull().default('receptionist'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ====================================================================
// SETTINGS — App configuration (key-value store)
// ====================================================================
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ====================================================================
// PRIZE_RULES — Dynamic metadata templates per prize
// ====================================================================
export const prizeRules = pgTable('prize_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  prizeName: text('prize_name').notNull().unique(),
  minimumBilling: integer('minimum_billing'),
  nextVisitOnly: boolean('next_visit_only').notNull().default(false),
  showMinimumBilling: boolean('show_minimum_billing').notNull().default(false),
  terms: text('terms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ====================================================================
// COUPON_PRIZES — Prize pool definitions per campaign
// ====================================================================
export const couponPrizes = pgTable('coupon_prizes', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  prize: text('prize').notNull(),
  quantity: integer('quantity').notNull(),
  remaining: integer('remaining').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
