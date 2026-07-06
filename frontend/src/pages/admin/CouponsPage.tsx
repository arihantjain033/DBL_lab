import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignApi, couponApi } from '@/lib/api';
import {
  Plus, Trash2, Ticket, User, Phone, MapPin,
  CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PrizeRow { prize: string; quantity: number }

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  available: { label: 'Available',  cls: 'text-primary-400 bg-primary-500/10',  icon: Clock },
  assigned:  { label: 'Assigned',   cls: 'text-gold-400 bg-gold-500/10',         icon: User },
  redeemed:  { label: 'Redeemed',   cls: 'text-blue-400 bg-blue-500/10',         icon: CheckCircle },
  expired:   { label: 'Expired',    cls: 'text-red-400 bg-red-500/10',           icon: XCircle },
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function CouponsPage() {
  const qc = useQueryClient();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const [prizes, setPrizes] = useState<PrizeRow[]>([{ prize: '', quantity: 1 }]);
  const [expiryDate, setExpiryDate] = useState('');

  const { data: campaignsRes } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list(),
  });
  const campaigns: any[] = campaignsRes?.data?.data ?? [];
  const activeCampaignId = selectedCampaign || campaigns.find((c) => c.active)?.id || '';

  const { data: couponsRes, isLoading } = useQuery({
    queryKey: ['coupons', activeCampaignId, filterStatus, page],
    queryFn: () =>
      couponApi.list(activeCampaignId, {
        limit: LIMIT,
        page,
        ...(filterStatus ? { status: filterStatus } : {}),
      }),
    enabled: !!activeCampaignId,
  });
  const coupons: any[] = couponsRes?.data?.data?.coupons ?? [];
  const totalPages = couponsRes?.data?.data?.totalPages ?? 1;

  const generateMutation = useMutation({
    mutationFn: () =>
      couponApi.generate({
        campaignId: activeCampaignId,
        prizes: prizes.filter((p) => p.prize && p.quantity > 0),
        ...(expiryDate ? { expiryDate: new Date(expiryDate).toISOString() } : {}),
      }),
    onSuccess: (res) => {
      toast.success(`Generated ${res.data.data.generated} coupons!`);
      qc.invalidateQueries({ queryKey: ['coupons'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowGenerator(false);
      setPrizes([{ prize: '', quantity: 1 }]);
      setExpiryDate('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to generate coupons'),
  });

  const addPrizeRow = () => setPrizes((p) => [...p, { prize: '', quantity: 1 }]);
  const removePrizeRow = (i: number) => setPrizes((p) => p.filter((_, idx) => idx !== i));
  const updatePrize = (i: number, field: keyof PrizeRow, val: string | number) =>
    setPrizes((p) => p.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  const totalQty = prizes.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  return (
    <div className="space-y-6 page-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Coupons</h1>
          <p className="text-primary-400 text-sm mt-0.5">
            Full coupon registry with holder details
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Campaign picker */}
          {campaigns.length > 1 && (
            <select
              value={activeCampaignId}
              onChange={(e) => { setSelectedCampaign(e.target.value); setPage(1); }}
              className="input-field max-w-[200px] text-sm"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-field text-sm w-36"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="redeemed">Redeemed</option>
          </select>
          <button
            id="btn-generate-coupons"
            onClick={() => setShowGenerator(true)}
            className="btn-primary flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Generate Coupons
          </button>
        </div>
      </div>

      {/* Table */}
      {!activeCampaignId ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Ticket className="w-10 h-10 text-primary-700 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Select or create a campaign first</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : coupons.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Ticket className="w-10 h-10 text-primary-700 mx-auto mb-3" />
          <p className="text-white/60 text-sm">No coupons found.</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Coupon No.</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Prize</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Status</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Holder Name</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Mobile</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs hidden lg:table-cell">City</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs hidden lg:table-cell">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {coupons.map((c: any) => {
                  const st = STATUS_STYLES[c.status] ?? STATUS_STYLES.available;
                  const StatusIcon = st.icon;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Coupon No */}
                      <td className="px-5 py-3 font-mono text-white text-xs font-bold whitespace-nowrap">
                        {c.couponNo}
                      </td>
                      {/* Prize */}
                      <td className="px-5 py-3 text-white/80 text-xs max-w-[160px]">
                        <span className="line-clamp-2">{c.prize}</span>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      {/* Holder Name */}
                      <td className="px-5 py-3">
                        {c.userName ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-primary-500 flex-shrink-0" />
                            <span className="text-white text-xs font-medium">{c.userName}</span>
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* Mobile */}
                      <td className="px-5 py-3">
                        {c.userPhone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-primary-500 flex-shrink-0" />
                            <span className="text-white/80 text-xs font-mono">{c.userPhone}</span>
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* City */}
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {c.userCity ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-primary-500 flex-shrink-0" />
                            <span className="text-white/60 text-xs">{c.userCity}</span>
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* Expiry */}
                      <td className="px-5 py-3 text-white/40 text-xs hidden lg:table-cell whitespace-nowrap">
                        {fmtDate(c.expiryDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white/40 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Generator Modal */}
      {showGenerator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowGenerator(false)}
        >
          <div
            className="glass rounded-3xl p-8 w-full max-w-lg shadow-glass animate-scale-in overflow-y-auto max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-bold text-white mb-1">Generate Coupons</h2>
            <p className="text-primary-400 text-xs mb-6">
              Coupons are shuffled randomly before assignment.
            </p>

            <div className="space-y-3 mb-4">
              {prizes.map((row, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Prize name (e.g. ₹300 Discount)"
                      value={row.prize}
                      onChange={(e) => updatePrize(i, 'prize', e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => updatePrize(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="input-field text-sm"
                    />
                  </div>
                  {prizes.length > 1 && (
                    <button
                      onClick={() => removePrizeRow(i)}
                      className="p-2.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-colors mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addPrizeRow}
              className="flex items-center gap-2 text-primary-400 hover:text-white text-sm transition-colors mb-5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Prize Tier
            </button>

            <div className="mb-5">
              <label className="block text-xs text-primary-300 mb-1.5">
                Expiry Date (Optional — if blank, per-user 6-month expiry applies)
              </label>
              <input
                type="datetime-local"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/40 mb-5 px-1">
              <span>Total coupons:</span>
              <span className="font-bold text-white">{totalQty.toLocaleString()}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerator(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-generate"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || !activeCampaignId || totalQty === 0}
                className="btn-gold flex-1 py-2.5"
              >
                {generateMutation.isPending
                  ? <LoadingSpinner size="sm" />
                  : `Generate ${totalQty} Coupons`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
