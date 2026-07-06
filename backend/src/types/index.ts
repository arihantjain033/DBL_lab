// Internal TypeScript types for the backend (not shared)

export type AdminRole = 'superadmin' | 'admin' | 'receptionist';
export type CouponStatus = 'available' | 'assigned' | 'redeemed' | 'expired';

export interface JwtPayload {
  id: string;
  email: string;
  role: AdminRole;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
