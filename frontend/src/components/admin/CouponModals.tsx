import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Edit2, Ticket, MapPin, Phone, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { couponApi } from '@/lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { parseApiError } from '@/lib/error';

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  available: { label: 'Available', cls: 'text-primary-400 bg-primary-500/10', icon: Clock },
  assigned: { label: 'Assigned', cls: 'text-gold-400 bg-gold-500/10', icon: User },
  redeemed: { label: 'Redeemed', cls: 'text-blue-400 bg-blue-500/10', icon: CheckCircle },
  expired: { label: 'Expired', cls: 'text-red-400 bg-red-500/10', icon: XCircle },
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export function ViewCouponModal({ coupon, onClose }: { coupon: any, onClose: () => void }) {
  if (!coupon) return null;
  const st = STATUS_STYLES[coupon.status] ?? STATUS_STYLES.available;
  const StatusIcon = st.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-3xl p-8 w-full max-w-lg shadow-glass animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary-500" /> Coupon Details
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-white/40 text-xs block mb-1">Coupon Number</span>
              <span className="text-white font-mono font-bold">{coupon.couponNo}</span>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-white/40 text-xs block mb-1">Status</span>
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${st.cls.split(' ')[0]}`}>
                <StatusIcon className="w-4 h-4" /> {st.label}
              </span>
            </div>
          </div>
          
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <span className="text-white/40 text-xs block mb-1">Prize</span>
            <span className="text-white font-medium">{coupon.prize}</span>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h3 className="text-white/80 text-sm font-semibold mb-3 border-b border-white/10 pb-2">Timeline</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div><span className="text-white/40 text-xs block">Created At</span> <span className="text-white/80">{fmtDate(coupon.createdAt)}</span></div>
              <div><span className="text-white/40 text-xs block">Assigned At</span> <span className="text-white/80">{fmtDate(coupon.assignedAt)}</span></div>
              <div><span className="text-white/40 text-xs block">Redeemed At</span> <span className="text-white/80">{fmtDate(coupon.redeemedAt)}</span></div>
              <div><span className="text-white/40 text-xs block">Expiry Date</span> <span className="text-white/80">{fmtDate(coupon.expiryDate)}</span></div>
            </div>
          </div>

          {(coupon.userName || coupon.userPhone) && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h3 className="text-white/80 text-sm font-semibold mb-3 border-b border-white/10 pb-2">Customer Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary-500" /> <span className="text-white">{coupon.userName}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary-500" /> <span className="text-white/80">{coupon.userPhone}</span></div>
                {coupon.userEmail && <div className="flex items-center gap-2"><span className="text-primary-500 font-bold ml-1">@</span> <span className="text-white/80">{coupon.userEmail}</span></div>}
                {coupon.userCity && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-500" /> <span className="text-white/80">{coupon.userCity}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const toLocalDatetime = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function EditCouponModal({ coupon, onClose }: { coupon: any, onClose: () => void }) {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    couponNo: '',
    prize: '',
    status: '',
    expiryDate: '',
    userName: '',
    userPhone: '',
    userEmail: '',
    userCity: ''
  });

  useEffect(() => {
    if (coupon) {
      setFormData({
        couponNo: coupon.couponNo || '',
        prize: coupon.prize || '',
        status: coupon.status || 'available',
        expiryDate: toLocalDatetime(coupon.expiryDate),
        userName: coupon.userName || '',
        userPhone: coupon.userPhone || '',
        userEmail: coupon.userEmail || '',
        userCity: coupon.userCity || ''
      });
    }
  }, [coupon]);

  const mutation = useMutation({
    mutationFn: (data: any) => couponApi.update(coupon.id, data),
    onSuccess: () => {
      toast.success('Coupon updated successfully');
      qc.invalidateQueries({ queryKey: ['all-coupons'] });
      onClose();
    },
    onError: (e: any) => toast.error(parseApiError(e))
  });

  if (!coupon) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...formData };
    if (payload.expiryDate) {
      payload.expiryDate = new Date(payload.expiryDate).toISOString();
    } else {
      payload.expiryDate = null;
    }
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-3xl p-8 w-full max-w-lg shadow-glass animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary-500" /> Edit Coupon
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-primary-400 mb-1">Coupon Number</label>
              <input type="text" value={formData.couponNo} onChange={e => setFormData({ ...formData, couponNo: e.target.value })} className="input-field text-sm font-mono" required />
            </div>
            <div>
              <label className="block text-xs text-primary-400 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="input-field text-sm">
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-primary-400 mb-1">Prize</label>
            <input type="text" value={formData.prize} onChange={e => setFormData({ ...formData, prize: e.target.value })} className="input-field text-sm" required />
          </div>

          <div>
            <label className="block text-xs text-primary-400 mb-1">Expiry Date (Optional)</label>
            <input type="datetime-local" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className="input-field text-sm" />
          </div>

          {(formData.status !== 'available' || coupon.assignedTo) && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-white/80 text-sm font-semibold mb-2">Customer Details</h3>
              <div>
                <label className="block text-xs text-primary-400 mb-1">Name</label>
                <input type="text" value={formData.userName} onChange={e => setFormData({ ...formData, userName: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1">Phone</label>
                <input type="text" value={formData.userPhone} onChange={e => setFormData({ ...formData, userPhone: e.target.value })} className="input-field text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-primary-400 mb-1">Email</label>
                  <input type="email" value={formData.userEmail} onChange={e => setFormData({ ...formData, userEmail: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-primary-400 mb-1">City</label>
                  <input type="text" value={formData.userCity} onChange={e => setFormData({ ...formData, userCity: e.target.value })} className="input-field text-sm" />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 py-2.5">
              {mutation.isPending ? <LoadingSpinner size="sm" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteConfirmModal({ coupon, onClose }: { coupon: any, onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => couponApi.delete(coupon.id),
    onSuccess: () => {
      toast.success('Coupon deleted permanently');
      qc.invalidateQueries({ queryKey: ['all-coupons'] });
      onClose();
    },
    onError: (e: any) => toast.error(parseApiError(e))
  });

  if (!coupon) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass border-red-500/20 rounded-3xl p-8 w-full max-w-sm shadow-glass animate-scale-in text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">Delete Coupon?</h2>
        <p className="text-white/60 text-sm mb-6">
          Are you sure you want to permanently delete coupon <span className="font-mono text-white">{coupon.couponNo}</span>? This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl flex-1 py-2.5 transition-colors flex items-center justify-center">
            {mutation.isPending ? <LoadingSpinner size="sm" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
