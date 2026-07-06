import { z } from 'zod';

// ---- User Registration ----
export const registerUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  city: z.string().max(100).optional(),
  campaignId: z.string().uuid('Invalid campaign ID'),
});

// ---- Scratch ----
export const scratchSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  campaignId: z.string().uuid('Invalid campaign ID'),
});

// ---- Admin Login ----
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ---- Create Campaign ----
export const createCampaignSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// ---- Update Campaign ----
export const updateCampaignSchema = createCampaignSchema.partial().extend({
  active: z.boolean().optional(),
});

// ---- Generate Coupons ----
export const generateCouponsSchema = z.object({
  campaignId: z.string().uuid(),
  prizes: z
    .array(
      z.object({
        prize: z.string().min(1).max(200),
        quantity: z.number().int().positive().max(100000),
      }),
    )
    .min(1, 'At least one prize is required'),
  expiryDate: z.string().datetime().optional(),
});

// ---- Redeem Coupon ----
export const redeemCouponSchema = z.object({
  couponNo: z
    .string()
    .regex(/^DBL-\d{4}$/, 'Invalid coupon number format. Expected: DBL-XXXX'),
});

// ---- Settings ----
export const updateSettingSchema = z.object({
  value: z.string(),
});

// ---- Pagination ----
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type ScratchInput = z.infer<typeof scratchSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type GenerateCouponsInput = z.infer<typeof generateCouponsSchema>;
export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
