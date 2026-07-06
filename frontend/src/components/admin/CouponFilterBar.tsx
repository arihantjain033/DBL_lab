import { Search, Filter, RotateCcw, Download } from 'lucide-react';
import { CouponFilterState } from '@/hooks/useCouponFilters';
import Dropdown from '@/components/ui/Dropdown';

interface Props {
  filters: CouponFilterState;
  setFilters: React.Dispatch<React.SetStateAction<CouponFilterState>>;
  applyFilters: () => void;
  resetFilters: () => void;
  campaigns: any[];
  uniquePrizes: string[];
  onExport: (format: 'csv' | 'excel') => void;
}

export default function CouponFilterBar({
  filters,
  setFilters,
  applyFilters,
  resetFilters,
  campaigns,
  uniquePrizes,
  onExport,
}: Props) {
  const update = (key: keyof CouponFilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters();
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-5 animate-scale-in" onKeyDown={handleKeyDown}>
      {/* Top Row: Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Coupon Number, Name, Mobile, Email or City..."
            value={filters.globalSearch}
            onChange={(e) => update('globalSearch', e.target.value)}
            className="input-field pl-10 min-h-[44px] w-full placeholder-white/30"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={applyFilters}
            className="btn-primary min-h-[44px] px-6 flex-1 sm:flex-none"
          >
            <Search className="w-4 h-4 mr-2" /> Find
          </button>

          <button
            onClick={resetFilters}
            className="btn-secondary min-h-[44px] px-4 flex-1 sm:flex-none"
            title="Clear all filters"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset Filters
          </button>
          
          <div className="relative group flex-1 sm:flex-none flex">
            <button className="btn-secondary min-h-[44px] px-4 w-full justify-center">
              <Download className="w-4 h-4 mr-2" /> Export
            </button>
            <div className="absolute right-0 top-full mt-2 w-32 glass rounded-xl shadow-glass opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden flex flex-col">
              <button onClick={() => onExport('csv')} className="px-4 py-3 text-sm text-white hover:bg-white/10 text-left">
                Export CSV
              </button>
              <button onClick={() => onExport('excel')} className="px-4 py-3 text-sm text-white hover:bg-white/10 text-left">
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Grid for Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        
        <div className="space-y-1.5 z-50">
          <label className="text-xs text-primary-400 font-medium ml-1">Campaign</label>
          <Dropdown
            value={filters.campaignId}
            onChange={(v) => update('campaignId', v)}
            options={[
              { value: 'all', label: 'All Campaigns' },
              ...campaigns.map(c => ({ value: c.id, label: c.name }))
            ]}
          />
        </div>

        <div className="space-y-1.5 z-40">
          <label className="text-xs text-primary-400 font-medium ml-1">Prize Type</label>
          <Dropdown
            value={filters.prizeType}
            onChange={(v) => update('prizeType', v)}
            options={[
              { value: 'all', label: 'All Prizes' },
              ...uniquePrizes.map(p => ({ value: p, label: p }))
            ]}
          />
        </div>

        <div className="space-y-1.5 z-30">
          <label className="text-xs text-primary-400 font-medium ml-1">Status</label>
          <Dropdown
            value={filters.status}
            onChange={(v) => update('status', v)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'available', label: 'Available' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'redeemed', label: 'Redeemed' },
              { value: 'expired', label: 'Expired' }
            ]}
          />
        </div>

        <div className="space-y-1.5 z-20">
          <label className="text-xs text-primary-400 font-medium ml-1">Redemption</label>
          <Dropdown
            value={filters.redeemedStatus}
            onChange={(v) => update('redeemedStatus', v)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'redeemed', label: 'Redeemed' },
              { value: 'not_redeemed', label: 'Not Redeemed' }
            ]}
          />
        </div>

        <div className="space-y-1.5 z-10">
          <label className="text-xs text-primary-400 font-medium ml-1">Validity</label>
          <Dropdown
            value={filters.validityStatus}
            onChange={(v) => update('validityStatus', v)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'valid', label: 'Valid' },
              { value: 'expired', label: 'Expired' }
            ]}
          />
        </div>

        <div className="space-y-1.5 z-0">
          <label className="text-xs text-primary-400 font-medium ml-1">Sort By</label>
          <Dropdown
            icon={Filter}
            value={filters.sortBy}
            onChange={(v) => update('sortBy', v)}
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'coupon_az', label: 'Coupon No (A-Z)' },
              { value: 'coupon_za', label: 'Coupon No (Z-A)' },
              { value: 'name', label: 'Participant Name' },
              { value: 'prize', label: 'Prize Name' },
              { value: 'city', label: 'City' },
              { value: 'expiry', label: 'Expiry Date' },
              { value: 'redeemed_date', label: 'Redeemed Date' }
            ]}
          />
        </div>

      </div>

      {/* Grid for Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs text-primary-400 font-medium ml-1">Created Start Date</label>
          <input type="date" value={filters.dateCreatedStart} onChange={(e) => update('dateCreatedStart', e.target.value)} className="input-field text-sm focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-primary-400 font-medium ml-1">Created End Date</label>
          <input type="date" value={filters.dateCreatedEnd} onChange={(e) => update('dateCreatedEnd', e.target.value)} className="input-field text-sm focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-primary-400 font-medium ml-1">Redeemed Start Date</label>
          <input type="date" value={filters.redeemedDateStart} onChange={(e) => update('redeemedDateStart', e.target.value)} className="input-field text-sm focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-primary-400 font-medium ml-1">Redeemed End Date</label>
          <input type="date" value={filters.redeemedDateEnd} onChange={(e) => update('redeemedDateEnd', e.target.value)} className="input-field text-sm focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>
    </div>
  );
}
