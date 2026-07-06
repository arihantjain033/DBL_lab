import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignApi } from '@/lib/api';
import {
  Users, User, Phone, MapPin, Trophy,
  ChevronLeft, ChevronRight, CheckCircle,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/admin/Pagination';

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  available: { label: 'Not Scratched', cls: 'text-white/40 bg-white/5',      dot: 'bg-white/20' },
  assigned:  { label: 'Won',           cls: 'text-gold-400 bg-gold-500/10',   dot: 'bg-gold-400' },
  redeemed:  { label: 'Redeemed',      cls: 'text-blue-400 bg-blue-500/10',   dot: 'bg-blue-400' },
  expired:   { label: 'Expired',       cls: 'text-red-400 bg-red-500/10',     dot: 'bg-red-400' },
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

export default function ParticipantsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => Number(localStorage.getItem('adminPageSize')) || 50);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    localStorage.setItem('adminPageSize', newLimit.toString());
  };

  // Load all campaigns
  const { data: campaignsRes } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list(),
  });
  const campaigns: any[] = campaignsRes?.data?.data ?? [];
  const activeCampaignId = selectedCampaign || campaigns.find((c) => c.active)?.id || '';

  // Load participants for selected campaign
  const { data: participantsRes, isLoading } = useQuery({
    queryKey: ['participants', activeCampaignId, page],
    queryFn: () =>
      campaignApi.getParticipants(activeCampaignId, { page, limit }),
    enabled: !!activeCampaignId,
  });

  const participants: any[] = participantsRes?.data?.data?.participants ?? [];
  const total: number = participantsRes?.data?.data?.total ?? 0;
  const totalPages: number = participantsRes?.data?.data?.totalPages ?? 1;

  const scratched = participants.filter((p) => p.couponNo).length;
  const redeemed  = participants.filter((p) => p.redeemed).length;

  return (
    <div className="space-y-6 page-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Participants</h1>
          <p className="text-primary-400 text-sm mt-0.5">
            Full list of registered users with their prize details
          </p>
        </div>
        {campaigns.length > 1 && (
          <select
            value={activeCampaignId}
            onChange={(e) => { setSelectedCampaign(e.target.value); setPage(1); }}
            className="input-field text-sm w-64"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Quick stats row */}
      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Registered" value={total} icon={Users} color="text-white" />
          <StatCard label="Scratched Cards" value={scratched} icon={Trophy} color="text-gold-400" />
          <StatCard label="Redeemed" value={redeemed} icon={CheckCircle} color="text-blue-400" />
        </div>
      )}

      {/* Table */}
      {!activeCampaignId ? (
        <EmptyState icon={Users} message="Select a campaign to view participants" />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : participants.length === 0 ? (
        <EmptyState icon={Users} message="No participants yet for this campaign" />
      ) : (
        <>
          <div className="glass rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">#</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Name</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Mobile</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs hidden md:table-cell">City</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Coupon</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Prize Won</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs">Status</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs hidden xl:table-cell">Valid Until</th>
                  <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs hidden xl:table-cell">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {participants.map((p: any, i: number) => {
                  const st = p.couponNo
                    ? (STATUS_STYLES[p.status] ?? STATUS_STYLES.assigned)
                    : { label: 'Not Scratched', cls: 'text-white/30 bg-white/5', dot: 'bg-white/10' };

                  return (
                    <tr key={p.userId} className="hover:bg-white/[0.02] transition-colors">
                      {/* Row # */}
                      <td className="px-5 py-3 text-white/20 text-xs">
                        {(page - 1) * limit + i + 1}
                      </td>
                      {/* Name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-800 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-primary-400" />
                          </div>
                          <div>
                            <p className="text-white text-xs font-semibold">{p.userName}</p>
                            {p.userEmail && (
                              <p className="text-white/30 text-[10px] mt-0.5 truncate max-w-[140px]">{p.userEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Mobile */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-primary-600 flex-shrink-0" />
                          <span className="text-white/80 text-xs font-mono">{p.userPhone}</span>
                        </div>
                      </td>
                      {/* City */}
                      <td className="px-5 py-3 hidden md:table-cell">
                        {p.userCity ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-primary-600 flex-shrink-0" />
                            <span className="text-white/60 text-xs">{p.userCity}</span>
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* Coupon No */}
                      <td className="px-5 py-3">
                        {p.couponNo ? (
                          <span className="font-mono text-white text-xs font-bold bg-primary-800/60 px-2 py-0.5 rounded-lg">
                            {p.couponNo}
                          </span>
                        ) : (
                          <span className="text-white/20 text-xs">Not scratched</span>
                        )}
                      </td>
                      {/* Prize */}
                      <td className="px-5 py-3 max-w-[180px]">
                        {p.prize ? (
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-3 h-3 text-gold-500 flex-shrink-0" />
                            <span className="text-white/80 text-xs line-clamp-2">{p.prize}</span>
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      {/* Valid Until */}
                      <td className="px-5 py-3 text-white/40 text-xs hidden xl:table-cell whitespace-nowrap">
                        {fmtDate(p.expiryDate)}
                      </td>
                      {/* Registered At */}
                      <td className="px-5 py-3 text-white/30 text-xs hidden xl:table-cell whitespace-nowrap">
                        {fmtDateTime(p.registeredAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
          />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-white font-bold text-xl">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <Icon className="w-10 h-10 text-primary-700 mx-auto mb-3" />
      <p className="text-white/50 text-sm">{message}</p>
    </div>
  );
}
