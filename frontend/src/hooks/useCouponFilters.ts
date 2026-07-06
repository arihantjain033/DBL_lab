import { useState, useMemo } from 'react';

export interface CouponFilterState {
  globalSearch: string;
  campaignId: string; // 'all' or specific ID
  prizeType: string;
  status: string; // 'all', 'available', 'assigned', 'redeemed', 'expired'
  redeemedStatus: string; // 'all', 'redeemed', 'not_redeemed'
  dateCreatedStart: string;
  dateCreatedEnd: string;
  redeemedDateStart: string;
  redeemedDateEnd: string;
  validityStatus: string; // 'all', 'valid', 'expired'
  sortBy: string;
}

export const initialFilterState: CouponFilterState = {
  globalSearch: '',
  campaignId: 'all',
  prizeType: 'all',
  status: 'all',
  redeemedStatus: 'all',
  dateCreatedStart: '',
  dateCreatedEnd: '',
  redeemedDateStart: '',
  redeemedDateEnd: '',
  validityStatus: 'all',
  sortBy: 'newest',
};

export function useCouponFilters(rawCoupons: any[]) {
  const [draftFilters, setDraftFilters] = useState<CouponFilterState>(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState<CouponFilterState>(initialFilterState);

  const applyFilters = () => setAppliedFilters(draftFilters);

  const resetFilters = () => {
    setDraftFilters(initialFilterState);
    setAppliedFilters(initialFilterState);
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...rawCoupons];

    // Use appliedFilters for actual data transformation!
    const filters = appliedFilters;

    // 1. Global Search
    if (filters.globalSearch) {
      const lowerSearch = filters.globalSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.couponNo?.toLowerCase().includes(lowerSearch) ||
          c.userName?.toLowerCase().includes(lowerSearch) ||
          c.userPhone?.toLowerCase().includes(lowerSearch) ||
          c.userEmail?.toLowerCase().includes(lowerSearch) ||
          c.userCity?.toLowerCase().includes(lowerSearch) ||
          c.prize?.toLowerCase().includes(lowerSearch)
      );
    }

    // 2. Campaign Filter
    if (filters.campaignId && filters.campaignId !== 'all') {
      result = result.filter((c) => c.campaignId === filters.campaignId);
    }

    // 3. Prize Filter
    if (filters.prizeType && filters.prizeType !== 'all') {
      result = result.filter((c) => c.prize === filters.prizeType);
    }

    // 4. Status Filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter((c) => c.status === filters.status);
    }

    // 5. Redeemed Status
    if (filters.redeemedStatus && filters.redeemedStatus !== 'all') {
      const isRedeemed = filters.redeemedStatus === 'redeemed';
      result = result.filter((c) => !!c.redeemed === isRedeemed);
    }

    // 6. Validity Status
    if (filters.validityStatus && filters.validityStatus !== 'all') {
      const now = new Date().getTime();
      result = result.filter((c) => {
        if (!c.expiryDate) return filters.validityStatus === 'valid';
        const expiry = new Date(c.expiryDate).getTime();
        const isExpired = expiry < now;
        return filters.validityStatus === 'expired' ? isExpired : !isExpired;
      });
    }

    // 7. Date Created Filter
    if (filters.dateCreatedStart) {
      const start = new Date(filters.dateCreatedStart).getTime();
      result = result.filter((c) => c.createdAt && new Date(c.createdAt).getTime() >= start);
    }
    if (filters.dateCreatedEnd) {
      const end = new Date(filters.dateCreatedEnd).getTime();
      result = result.filter((c) => c.createdAt && new Date(c.createdAt).getTime() <= end);
    }

    // 8. Redeemed Date Filter
    if (filters.redeemedDateStart) {
      const start = new Date(filters.redeemedDateStart).getTime();
      result = result.filter((c) => c.redeemedAt && new Date(c.redeemedAt).getTime() >= start);
    }
    if (filters.redeemedDateEnd) {
      const end = new Date(filters.redeemedDateEnd).getTime();
      result = result.filter((c) => c.redeemedAt && new Date(c.redeemedAt).getTime() <= end);
    }

    // 9. Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'coupon_az':
          return (a.couponNo || '').localeCompare(b.couponNo || '');
        case 'coupon_za':
          return (b.couponNo || '').localeCompare(a.couponNo || '');
        case 'name':
          return (a.userName || '').localeCompare(b.userName || '');
        case 'prize':
          return (a.prize || '').localeCompare(b.prize || '');
        case 'city':
          return (a.userCity || '').localeCompare(b.userCity || '');
        case 'expiry':
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case 'redeemed_date':
          if (!a.redeemedAt && !b.redeemedAt) return 0;
          if (!a.redeemedAt) return 1;
          if (!b.redeemedAt) return -1;
          return new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [rawCoupons, appliedFilters]);

  return { draftFilters, setDraftFilters, appliedFilters, applyFilters, resetFilters, filteredAndSorted };
}
