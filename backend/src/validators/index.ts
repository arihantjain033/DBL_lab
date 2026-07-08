import { z } from 'zod';

// ---- User Registration ----
export const registerUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
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

// ---- Update Coupon ----
export const updateCouponSchema = z.object({
  couponNo: z.string().min(1, 'Coupon number is required').optional(),
  prize: z.string().min(1, 'Prize is required').optional(),
  status: z.enum(['available', 'assigned', 'redeemed', 'expired']).optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  
  // User details (if assigned)
  userName: z.string().min(2).max(100).optional(),
  userPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
  userEmail: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  userCity: z.string().max(100).optional(),
});

// ---- Batch Update Coupons ----
export const batchUpdateCouponSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  targetPrize: z.string().min(1, 'Target prize is required'),
  count: z.number().int().positive('Count must be greater than 0'),
  updateData: z.object({
    prize: z.string().min(1).optional(),
    status: z.enum(['available', 'assigned', 'redeemed', 'expired']).optional(),
    expiryDate: z.string().datetime().nullable().optional(),
  }).refine(data => Object.keys(data).length > 0, 'No fields to update')
});

// ---- Settings ----
export const updateSettingSchema = z.object({
  value: z.string(),
});

// ---- Pagination ----
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100000).default(20),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type ScratchInput = z.infer<typeof scratchSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type GenerateCouponsInput = z.infer<typeof generateCouponsSchema>;
export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type BatchUpdateCouponInput = z.infer<typeof batchUpdateCouponSchema>;
