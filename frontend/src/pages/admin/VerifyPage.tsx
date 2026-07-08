import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { couponApi } from '@/lib/api';
import { ScanLine, Search, CheckCircle2, AlertCircle, User, Phone, Trophy, Calendar, Hash, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TermsAndConditions from '@/components/ui/TermsAndConditions';
import { parseApiError } from '@/lib/error';
import QRScanner from '@/components/admin/QRScanner';

interface VerifyResult {
  coupon: any;
  user: any;
}

const playBeep = (type: 'success' | 'error') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch(e) {}
};

export default function VerifyPage() {
  const [couponNo, setCouponNo] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount for HID scanners
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const verifyMutation = useMutation({
    mutationFn: (no: string) => couponApi.verify(no.toUpperCase().trim()),
    onSuccess: (res) => {
      playBeep('success');
      setResult(res.data.data);
      setCouponNo('');
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: (e: any) => {
      playBeep('error');
      setResult(null);
      toast.error(parseApiError(e));
      setCouponNo('');
      setTimeout(() => inputRef.current?.focus(), 100);
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (no: string) => couponApi.redeem({ couponNo: no }),
    onSuccess: (res) => {
      toast.success('Coupon redeemed successfully!');
      setResult((prev) => prev ? { ...prev, coupon: res.data.data } : null);
    },
    onError: (e: any) => toast.error(parseApiError(e)),
  });

  const handleScan = (data: string) => {
    setShowCamera(false);
    let extracted = data;
    try {
      const parsed = JSON.parse(data);
      // Support multiple payload structures just in case
      if (parsed.coupon) extracted = parsed.coupon;
      else if (parsed.couponNo) extracted = parsed.couponNo;
    } catch(e) {} // Not JSON, treat as plain string
    
    const cleaned = extracted.trim().toUpperCase();
    if (cleaned) {
      setCouponNo(cleaned); // Autofill the input field
      verifyMutation.mutate(cleaned);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = couponNo.trim().toUpperCase();
    if (!cleaned) return toast.error('Enter a coupon number');
    verifyMutation.mutate(cleaned);
  };

  const handleRedeem = () => {
    if (!result?.coupon?.couponNo) return;
    if (!confirm('Confirm redemption? This action is permanent.')) return;
    redeemMutation.mutate(result.coupon.couponNo);
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const statusConfig = {
    available: { label: 'Unclaimed', color: 'text-white/50 bg-white/5', icon: AlertCircle },
    assigned: { label: 'Claimed – Ready to Redeem', color: 'text-gold-400 bg-gold-500/10', icon: Trophy },
    redeemed: { label: 'Already Redeemed', color: 'text-blue-400 bg-blue-500/10', icon: CheckCircle2 },
    expired: { label: 'Expired', color: 'text-red-400 bg-red-500/10', icon: AlertCircle },
  };

  const coupon = result?.coupon;
  const user = result?.user;
  const status = coupon?.status as keyof typeof statusConfig | undefined;
  const StatusIcon = status ? statusConfig[status]?.icon : null;

  return (
    <div className="space-y-6 page-section max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Verify & Redeem</h1>
        <p className="text-primary-400 text-sm mt-0.5">Enter a coupon number to verify and redeem it</p>
      </div>

      {/* Search form */}
      <div className="glass rounded-2xl p-6">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
            <input
              ref={inputRef}
              id="coupon-verify-input"
              type="text"
              value={couponNo}
              onChange={(e) => setCouponNo(e.target.value.toUpperCase())}
              placeholder="DBL-000001"
              className="input-field pl-10 font-mono uppercase tracking-wider min-h-[44px] w-full"
              maxLength={10}
              autoComplete="off"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="btn-glass flex-shrink-0 min-h-[44px] justify-center px-4"
              title="Scan QR Code via Camera"
            >
              <Camera className="w-5 h-5 text-primary-400" />
            </button>
            <button
              id="btn-verify-coupon"
              type="submit"
              disabled={verifyMutation.isPending}
              className="btn-primary flex-1 sm:flex-none min-h-[44px] justify-center"
            >
              {verifyMutation.isPending ? <LoadingSpinner size="sm" /> : (
                <>
                  <Search className="w-4 h-4" /> Verify
                </>
              )}
            </button>
          </div>
        </form>

        {showCamera && <QRScanner onScan={handleScan} onClose={() => setShowCamera(false)} />}

        <p className="text-white/30 text-xs mt-3">Format: DBL-XXXXXX (e.g. DBL-000042)</p>
      </div>

      {/* Verification Result */}
      {coupon && status && StatusIcon && (
        <div className="glass rounded-2xl p-6 animate-scale-in">
          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 ${statusConfig[status].color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig[status].label}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <InfoRow icon={Hash} label="Coupon Number" value={coupon.couponNo} mono />
            <InfoRow icon={Trophy} label="Prize" value={coupon.prize} />
            {user && (
              <>
                <InfoRow icon={User} label="Patient Name" value={user.name} />
                <InfoRow icon={Phone} label="Mobile" value={user.phone} />
                {user.city && <InfoRow icon={ScanLine} label="City" value={user.city} />}
              </>
            )}
            <InfoRow icon={Calendar} label="Issued On" value={fmtDate(coupon.assignedAt)} />
            <InfoRow icon={Calendar} label="Valid Until" value={fmtDate(coupon.expiryDate)} />
            {coupon.redeemed && (
              <InfoRow icon={CheckCircle2} label="Redeemed On" value={fmtDate(coupon.redeemedAt)} />
            )}
          </div>

          {/* Redeem button */}
          {status === 'assigned' && !coupon.redeemed && (
            <button
              id="btn-redeem-coupon"
              onClick={handleRedeem}
              disabled={redeemMutation.isPending}
              className="btn-gold w-full py-3.5 text-base"
            >
              {redeemMutation.isPending ? <LoadingSpinner size="sm" /> : (
                <div className="flex items-center justify-center gap-2 w-full">
                  <CheckCircle2 className="w-5 h-5" /> Mark as Redeemed
                </div>
              )}
            </button>
          )}

          {coupon.redeemed && (
            <div className="flex items-center justify-center gap-2 py-3 text-blue-400 bg-blue-500/10 rounded-xl mb-6">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold text-sm">This coupon has been redeemed</span>
            </div>
          )}

          {/* Terms and Conditions for Admin reference */}
          <TermsAndConditions prizeType={coupon.prize} className="bg-black/20 border border-white/5" />
        </div>
      )}

      {/* Instructions */}
      {!result && (
        <div className="glass rounded-2xl p-6 opacity-60">
          <div className="flex items-center gap-2 mb-3">
            <ScanLine className="w-4 h-4 text-primary-400" />
            <p className="text-white text-sm font-semibold">How to verify</p>
          </div>
          <ul className="space-y-1.5 text-primary-400 text-xs">
            <li>1. Patient shows coupon number or QR code</li>
            <li>2. Enter the coupon number (DBL-XXXXXX) above</li>
            <li>3. Verify patient details match</li>
            <li>4. Click "Mark as Redeemed" to complete</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary-800/50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary-400" />
      </div>
      <div>
        <p className="text-white/40 text-xs">{label}</p>
        <p className={`text-white font-semibold text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
