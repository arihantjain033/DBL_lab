import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Layers, CheckCircle, AlertCircle } from 'lucide-react';
import { couponApi } from '@/lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { parseApiError } from '@/lib/error';

interface Props {
  rawCoupons: any[];
  activeCampaignId: string;
}

export default function BatchCouponUpdate({ rawCoupons, activeCampaignId }: Props) {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [targetPrize, setTargetPrize] = useState('');
  const [countStr, setCountStr] = useState('');

  const [updateData, setUpdateData] = useState({
    prize: '',
    status: '',
    expiryDate: ''
  });

  const [showPreview, setShowPreview] = useState(false);

  // Derive unique prizes for the active campaign
  const uniquePrizes = useMemo(() => {
    const campaignCoupons = rawCoupons.filter(c => c.campaignId === activeCampaignId);
    return Array.from(new Set(campaignCoupons.map(c => c.prize))).filter(Boolean) as string[];
  }, [rawCoupons, activeCampaignId]);

  // Derive target coupons found
  const stats = useMemo(() => {
    if (!targetPrize) return { total: 0, occupied: 0, available: 0 };
    const matching = rawCoupons.filter(c => c.campaignId === activeCampaignId && c.prize === targetPrize);
    const available = matching.filter(c => c.status === 'available').length;
    return {
      total: matching.length,
      occupied: matching.length - available,
      available
    };
  }, [targetPrize, rawCoupons, activeCampaignId]);

  const parsedCount = parseInt(countStr, 10);
  const countToUpdate = isNaN(parsedCount) ? 0 : parsedCount;

  const mutation = useMutation({
    mutationFn: (data: any) => couponApi.batchUpdate(data),
    onSuccess: (res) => {
      const { updated, skippedAssigned, skippedRedeemed, skippedExpired, failed } = res.data.data;
      
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-primary-950 border border-white/10 shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle className="h-5 w-5 text-primary-400" />
              </div>
              <div className="ml-3 flex-1 text-sm text-white/80 space-y-1">
                <p className="text-white font-bold mb-2">Batch Update Completed</p>
                <p>Total Targeted: <span className="text-white">{countToUpdate}</span></p>
                <p className="text-primary-400 font-medium">Successfully Updated: {updated}</p>
                {skippedAssigned > 0 && <p className="text-gold-400">Total Assigned (Skipped): {skippedAssigned}</p>}
                {skippedRedeemed > 0 && <p className="text-gold-400">Total Redeemed (Skipped): {skippedRedeemed}</p>}
                {skippedExpired > 0 && <p className="text-gold-400">Total Expired (Skipped): {skippedExpired}</p>}
                {failed > 0 && <p className="text-red-400">Failed: {failed}</p>}
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white/50 hover:text-white focus:outline-none">
              Close
            </button>
          </div>
        </div>
      ), { duration: 6000 });

      qc.invalidateQueries({ queryKey: ['all-coupons'] });
      setShowPreview(false);
      setIsOpen(false);
      // Reset
      setTargetPrize('');
      setCountStr('');
      setUpdateData({
        prize: '', status: '', expiryDate: ''
      });
    },
    onError: (e: any) => toast.error(parseApiError(e))
  });

  const handlePreview = () => {
    if (!targetPrize) {
      return toast.error('Please select a target prize.');
    }
    if (countToUpdate <= 0) {
      return toast.error('Please enter a valid number of coupons to update.');
    }
    if (countToUpdate > stats.available) {
      return toast.error(`You can only select up to ${stats.available} available coupons for this prize.`);
    }
    const hasUpdates = Object.values(updateData).some(v => v !== '');
    if (!hasUpdates) {
      return toast.error('Please enter at least one field to update.');
    }
    setShowPreview(true);
  };

  const handleConfirm = () => {
    // Strip empty fields
    const payloadData: any = {};
    if (updateData.prize) payloadData.prize = updateData.prize;
    if (updateData.status) payloadData.status = updateData.status;
    if (updateData.expiryDate) payloadData.expiryDate = new Date(updateData.expiryDate).toISOString();

    mutation.mutate({
      campaignId: activeCampaignId,
      targetPrize,
      count: countToUpdate,
      updateData: payloadData
    });
  };

  return (
    <div className="glass rounded-2xl mb-6 overflow-hidden animate-scale-in">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-lg">Batch Coupon Update</h3>
            <p className="text-white/50 text-xs">Update multiple coupons by prize name simultaneously.</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
      </div>

      {isOpen && (
        <div className="p-6 border-t border-white/5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Col: Selection */}
            <div className="space-y-4">
              <h4 className="text-white font-medium text-sm border-b border-white/10 pb-2">1. Select Target Coupons</h4>
              
              <div>
                <label className="block text-xs text-primary-400 mb-1">Target Prize Name (Current Prize)</label>
                <select 
                  value={targetPrize} 
                  onChange={e => setTargetPrize(e.target.value)} 
                  className="input-field text-sm"
                >
                  <option value="">-- Select Prize --</option>
                  {uniquePrizes.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-primary-400 mb-1">Number of AVAILABLE Coupons to Select</label>
                <input 
                  type="number" 
                  value={countStr} 
                  onChange={e => setCountStr(e.target.value)} 
                  className="input-field text-sm" 
                  placeholder="e.g. 10" 
                  min="1"
                  max={stats.available || 1}
                />
              </div>

              {/* Live Count Feedback */}
              {targetPrize && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs space-y-2">
                  <div className="text-white font-medium">
                    Total: <strong className="text-white">{stats.total}</strong> | Occupied: <strong className="text-gold-400">{stats.occupied}</strong> | Left: <strong className="text-primary-400">{stats.available}</strong>
                  </div>
                  {countToUpdate > 0 && (
                    <div className={countToUpdate <= stats.available ? "text-primary-400 font-medium" : "text-red-400"}>
                      You have selected to update {countToUpdate} available coupons.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Col: Fields to update */}
            <div className="space-y-4">
              <h4 className="text-white font-medium text-sm border-b border-white/10 pb-2">2. Enter New Values</h4>
              <p className="text-xs text-primary-400 mb-2">Leave a field empty to keep existing values unchanged.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">New Prize Name</label>
                  <input type="text" value={updateData.prize} onChange={e => setUpdateData({ ...updateData, prize: e.target.value })} className="input-field text-sm" placeholder="Leave empty to keep existing" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Status</label>
                    <select value={updateData.status} onChange={e => setUpdateData({ ...updateData, status: e.target.value })} className="input-field text-sm">
                      <option value="">Leave unchanged</option>
                      <option value="available">Available</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Expiry Date</label>
                    <input type="datetime-local" value={updateData.expiryDate} onChange={e => setUpdateData({ ...updateData, expiryDate: e.target.value })} className="input-field text-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end border-t border-white/5 mt-4">
                <button onClick={handlePreview} className="btn-primary px-6 py-2.5">Preview Changes</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
          <div className="glass rounded-3xl p-8 w-full max-w-md shadow-glass animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-white">Confirm Batch Update</h2>
                <p className="text-white/60 text-sm">Review your changes</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm">
                <ul className="space-y-2">
                  <li className="flex justify-between text-white"><span className="text-white/60">Target Prize:</span> <strong>{targetPrize}</strong></li>
                  <li className="flex justify-between text-white"><span className="text-white/60">Total Selected:</span> <strong className="text-gold-400">{countToUpdate}</strong></li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm">
                <h4 className="text-white font-medium border-b border-white/10 pb-2 mb-2">Fields to update:</h4>
                <ul className="space-y-1 text-white/80">
                  {updateData.prize && <li>New Prize Name: <span className="text-primary-400">{updateData.prize}</span></li>}
                  {updateData.status && <li>Status: <span className="text-primary-400">{updateData.status}</span></li>}
                  {updateData.expiryDate && <li>Expiry Date: <span className="text-primary-400">{new Date(updateData.expiryDate).toLocaleString()}</span></li>}
                </ul>
              </div>

              <p className="text-center text-white font-medium text-sm mt-4">
                You are about to batch update {countToUpdate} coupons.<br/>Continue?
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPreview(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={handleConfirm} disabled={mutation.isPending} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                {mutation.isPending ? <LoadingSpinner size="sm" /> : <><CheckCircle className="w-4 h-4" /> Execute Update</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
