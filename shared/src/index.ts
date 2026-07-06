// ============================================================
// Shared Types for DBL Digital Campaign & Coupon Engine
// Used by both frontend and backend
// ============================================================

// ---- Campaigns ----
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

// ---- Users ----
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  createdAt: string;
}

// ---- Coupons ----
export type CouponStatus = 'available' | 'assigned' | 'redeemed' | 'expired';

export interface Coupon {
  id: string;
  campaignId: string;
  couponNo: string;
  prize: string;
  status: CouponStatus;
  assignedTo: string | null;
  assignedAt: string | null;
  redeemed: boolean;
  redeemedAt: string | null;
  expiryDate: string | null;
}

// ---- Claims ----
export interface Claim {
  id: string;
  userId: string;
  couponId: string;
  ip: string | null;
  device: string | null;
  browser: string | null;
  createdAt: string;
}

// ---- Admins ----
export type AdminRole = 'superadmin' | 'admin' | 'receptionist';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

// ---- Settings ----
export interface Setting {
  key: string;
  value: string;
  description: string | null;
}

// ---- API Response Wrappers ----
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ---- Request Payloads ----
export interface RegisterUserPayload {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  campaignId: string;
}

export interface ScratchPayload {
  userId: string;
  campaignId: string;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface GenerateCouponsPayload {
  campaignId: string;
  prizes: Array<{
    prize: string;
    quantity: number;
  }>;
}

export interface RedeemCouponPayload {
  couponNo: string;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  totalCoupons: number;
  availableCoupons: number;
  assignedCoupons: number;
  redeemedCoupons: number;
  totalUsers: number;
  todayUsers: number;
  campaignName: string;
  campaignActive: boolean;
}

// ---- Coupon Verification Result ----
export interface CouponVerification {
  coupon: Coupon;
  user: User | null;
  claim: Claim | null;
}

// ---- Scratch Result ----
export interface ScratchResult {
  couponNo: string;
  prize: string;
  expiryDate: string | null;
}
