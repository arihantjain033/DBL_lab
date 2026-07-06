import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function Pagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <div className="flex items-center gap-3 text-sm text-white/50 w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Showing <span className="font-medium text-white/80">{startItem}</span> to{' '}
          <span className="font-medium text-white/80">{endItem}</span> of{' '}
          <span className="font-medium text-white/80">{totalItems}</span> results
        </span>

        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="input-field py-1 px-2 pr-8 text-xs min-h-0 bg-white/5 border-white/10"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="px-3 text-sm text-white/60 font-medium">
          Page {page} of {totalPages}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default memo(Pagination);
