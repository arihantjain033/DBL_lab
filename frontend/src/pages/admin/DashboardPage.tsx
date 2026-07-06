import { useQuery } from '@tanstack/react-query';
import { campaignApi, couponApi } from '@/lib/api';
import {
  Ticket,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  Gift,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-400' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`flex items-center gap-2 mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium text-white/50">{label}</span>
      </div>
      <p className="font-display text-3xl font-bold text-white">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: campaignRes } = useQuery({
    queryKey: ['active-campaign'],
    queryFn: () => campaignApi.getActive(),
  });
  const campaign = campaignRes?.data?.data;

  const { data: statsRes, isLoading } = useQuery({
    queryKey: ['dashboard', campaign?.id],
    queryFn: () => couponApi.dashboard(campaign!.id),
    enabled: !!campaign?.id,
    refetchInterval: 30000, // Auto-refresh every 30s
  });
  const stats = statsRes?.data?.data;

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <BarChart2 className="w-12 h-12 text-primary-700" />
        <h2 className="text-white font-semibold text-lg">No Active Campaign</h2>
        <p className="text-primary-400 text-sm max-w-sm">
          Create and activate a campaign to start seeing statistics here.
        </p>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner message="Loading dashboard..." />;

  const couponData = stats
    ? [
        { name: 'Available', value: stats.availableCoupons, color: '#10b981' },
        { name: 'Assigned', value: stats.assignedCoupons, color: '#f59e0b' },
        { name: 'Redeemed', value: stats.redeemedCoupons, color: '#6ee7b7' },
      ]
    : [];

  return (
    <div className="space-y-6 page-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-primary-400 text-sm mt-0.5">
            {campaign.name} ·{' '}
            <span
              className={`font-semibold ${campaign.active ? 'text-primary-400' : 'text-red-400'}`}
            >
              {campaign.active ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-white/30 text-xs">Last updated</p>
          <p className="text-white/60 text-xs font-mono">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Ticket}
          label="Total Coupons"
          value={stats?.totalCoupons ?? 0}
          color="text-primary-400"
        />
        <StatCard
          icon={Clock}
          label="Available"
          value={stats?.availableCoupons ?? 0}
          sub="Ready to be claimed"
          color="text-green-400"
        />
        <StatCard
          icon={Gift}
          label="Claimed"
          value={stats?.assignedCoupons ?? 0}
          sub="Waiting for redemption"
          color="text-gold-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Redeemed"
          value={stats?.redeemedCoupons ?? 0}
          sub="Fully used"
          color="text-primary-300"
        />
      </div>

      {/* Users Row */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={Users}
          label="Total Participants"
          value={stats?.totalUsers ?? 0}
          color="text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Today's Visitors"
          value={stats?.todayUsers ?? 0}
          sub="Registered today"
          color="text-violet-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coupon Status Chart */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5 text-sm">Coupon Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={couponData} barSize={40}>
              <XAxis dataKey="name" tick={{ fill: '#6ee7b7', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6ee7b7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(6,95,70,0.9)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {couponData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Prize Breakdown */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 text-sm">Prize Breakdown</h3>
          <div className="space-y-3 overflow-y-auto max-h-[200px] pr-1">
            {stats?.prizeBreakdown?.length ? (
              stats.prizeBreakdown.map((pb: any) => {
                const assignedPct = pb.total > 0 ? Math.round((pb.assigned / pb.total) * 100) : 0;
                return (
                  <div key={pb.prize}>
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-white text-xs font-medium truncate max-w-[60%]">{pb.prize}</p>
                      <p className="text-white/40 text-xs flex-shrink-0">
                        {pb.assigned}/{pb.total}
                      </p>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                        style={{ width: `${assignedPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-white/30 text-sm text-center py-4">No prizes generated yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
