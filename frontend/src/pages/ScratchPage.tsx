import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import ReactConfetti from 'react-confetti';
import { QRCodeSVG } from 'qrcode.react';
import {
  Trophy, Gift, Calendar, Hash, ArrowLeft,
  CheckCircle, Download, Sparkles, User, Phone, MapPin,
} from 'lucide-react';
import ScratchCard from '@/components/ScratchCard';
import { userApi } from '@/lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { jsPDF } from 'jspdf';

const SCRATCH_THRESHOLD = 35; // Configurable threshold (e.g. 35%)

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface ScratchResult {
  couponNo: string;
  prize: string;
  expiryDate: string | null;
}

interface ReceiptData {
  couponNo: string;
  prize: string;
  holderName: string;
  holderPhone: string;
  holderCity: string;
  scratchedOn: string;
  expiryDate: string;
  campaignName: string;
  labName: string;
  verifyUrl: string;
}

// ────────────────────────────────────────────────────────────
// PDF Generator — creates a branded A4 receipt
// ────────────────────────────────────────────────────────────
function generatePDF(receipt: ReceiptData, qrDataUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(4, 120, 87); // emerald-700
  doc.rect(0, 0, W, 52, 'F');

  // Lab name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DBL Pathology Lab', W / 2, 20, { align: 'center' });

  // Tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Diagnostic Services', W / 2, 28, { align: 'center' });

  // Gold divider
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.line(15, 33, W - 15, 33);

  // Prize badge
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('🎁  SCRATCH CARD REWARD RECEIPT', W / 2, 44, { align: 'center' });

  // Prize name box
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, 58, W - 30, 22, 3, 3, 'FD');
  doc.setTextColor(120, 53, 15); // amber-900
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.prize, W / 2, 71, { align: 'center', maxWidth: W - 40 });

  // Coupon number
  doc.setFillColor(236, 253, 245); // green-50
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(15, 86, W - 30, 14, 2, 2, 'FD');
  doc.setTextColor(4, 120, 87);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Coupon: ${receipt.couponNo}`, W / 2, 95, { align: 'center' });

  // Section: Holder Details
  let y = 108;
  doc.setTextColor(55, 65, 81); // gray-700
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HOLDER DETAILS', 15, y);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(15, y + 2, W - 15, y + 2);

  const rows: [string, string][] = [
    ['Name',         receipt.holderName],
    ['Mobile',       receipt.holderPhone],
    ['City',         receipt.holderCity || '—'],
    ['Scratched On', receipt.scratchedOn],
    ['Valid Until',  receipt.expiryDate],
    ['Campaign',     receipt.campaignName],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  rows.forEach(([label, value], i) => {
    const rowY = y + 10 + i * 9;
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(label, 18, rowY);
    doc.setTextColor(17, 24, 39);    // gray-900
    doc.setFont('helvetica', 'bold');
    doc.text(value, 70, rowY);
    doc.setFont('helvetica', 'normal');
  });

  // QR code
  if (qrDataUrl) {
    const qrSize = 44;
    doc.addImage(qrDataUrl, 'PNG', W - 15 - qrSize, y + 8, qrSize, qrSize);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.text('Scan to verify', W - 15 - qrSize / 2, y + 8 + qrSize + 4, { align: 'center' });
  }

  // Redemption instructions
  y = y + 10 + rows.length * 9 + 10;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, y, W - 30, 38, 2, 2, 'FD');
  doc.setTextColor(4, 120, 87);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('HOW TO REDEEM', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  const steps = [
    '1. Visit DBL Pathology Lab before the expiry date.',
    '2. Show this receipt or QR code to the reception staff.',
    '3. Provide your registered mobile number for verification.',
    '4. This coupon is valid for ONE use only and is non-transferable.',
  ];
  steps.forEach((step, i) => doc.text(step, 20, y + 16 + i * 6));

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(229, 231, 235);
  doc.line(15, footerY - 4, W - 15, footerY - 4);
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(7);
  doc.text(
    `DBL Pathology Lab  •  ${receipt.verifyUrl}  •  Generated: ${receipt.scratchedOn}`,
    W / 2, footerY,
    { align: 'center' },
  );

  doc.save(`DBL-Coupon-${receipt.couponNo}.pdf`);
}

// ────────────────────────────────────────────────────────────
// ScratchPage component
// ────────────────────────────────────────────────────────────
export default function ScratchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;

  // ── Scratch UI state ──
  const [scratchStarted, setScratchStarted] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [prizeRevealed, setPrizeRevealed] = useState(false);

  // ── Coupon data ──
  const [coupon, setCoupon] = useState<ScratchResult | null>(
    state?.alreadyScratch && state?.coupon ? state.coupon : null,
  );

  // ── QR canvas ref (for PDF export) ──
  const qrRef = useRef<HTMLDivElement>(null);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const h = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Redirect if no user state
  useEffect(() => {
    if (!state?.user) navigate('/', { replace: true });
  }, [state, navigate]);

  // Already scratched → skip to reveal
  useEffect(() => {
    if (state?.alreadyScratch && state?.coupon) {
      console.log('[ScratchPage Debug] User already scratched before, revealing immediately.');
      setPrizeRevealed(true);
    }
  }, [state]);

  // ── API mutation ──
  const scratchMutation = useMutation({
    mutationFn: () =>
      userApi.scratch({ userId: state?.user?.id, campaignId: state?.campaign?.id }),
    onSuccess: (res) => {
      const result = res.data.data as ScratchResult;
      setCoupon(result);
      // Prize reveal triggered from onComplete callback (after canvas clears)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Something went wrong. Please try again.');
      // Reset so user can try again
      setScratchStarted(false);
      setScratchPercent(0);
    },
  });

  // Prevent multiple API calls due to fast requestAnimationFrame ticks
  const apiFiredRef = useRef(false);

  // ── Canvas callbacks ──
  /**
   * Called on every scratch stroke with the current % of foil removed.
   * When user starts scratching we fire the API call (only once).
   */
  const handleProgress = useCallback(
    (pct: number) => {
      setScratchPercent(pct);
      // Trigger the API on first real scratch contact (>2%)
      if (pct > 2 && !apiFiredRef.current) {
        apiFiredRef.current = true;
        scratchMutation.mutate();
      }
    },
    [scratchMutation],
  );

  /**
   * Called when canvas crosses threshold.
   * Exclusively responsible for revealing the prize.
   */
  const handleScratchComplete = useCallback(() => {
    console.log('[ScratchPage Debug] handleScratchComplete() triggered by ScratchCard.onComplete()');
    setScratchPercent(100);
    setPrizeRevealed(true);
  }, []);

  // ── PDF download ──
  const handleDownloadPDF = useCallback(() => {
    if (!coupon) return;

    // Render QR to canvas via a hidden SVG-to-canvas conversion
    const svgEl = qrRef.current?.querySelector('svg');
    const serialized = svgEl ? new XMLSerializer().serializeToString(svgEl) : '';
    const img = new Image();
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);
      const qrDataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);

      const receipt: ReceiptData = {
        couponNo: coupon.couponNo,
        prize: coupon.prize,
        holderName: state?.user?.name ?? '',
        holderPhone: state?.user?.phone ?? '',
        holderCity: state?.user?.city ?? '',
        scratchedOn: new Date().toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
        }),
        expiryDate: coupon.expiryDate
          ? new Date(coupon.expiryDate).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'long', year: 'numeric',
            })
          : 'No Expiry',
        campaignName: state?.campaign?.name ?? 'DBL Pathology Lab',
        labName: 'DBL Pathology Lab',
        verifyUrl: window.location.origin,
      };

      generatePDF(receipt, qrDataUrl);
      toast.success('Receipt downloaded!');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('Could not generate PDF. Please screenshot instead.');
    };

    img.src = url;
  }, [coupon, state]);

  if (!state?.user) return <LoadingSpinner fullScreen />;

  // ── Formatters ──
  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'No Expiry';

  // ── QR value: full receipt JSON so scanning shows all details ──
  const qrValue = coupon
    ? JSON.stringify({
        lab: 'DBL Pathology Lab',
        coupon: coupon.couponNo,
        prize: coupon.prize,
        holder: state?.user?.name,
        phone: state?.user?.phone,
        validUntil: coupon.expiryDate ? fmtDate(coupon.expiryDate) : 'No Expiry',
        verify: `${window.location.origin}/verify/${coupon.couponNo}`,
      })
    : '';

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-forest-950">
      {/* Confetti */}
      {prizeRevealed && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={400}
          colors={['#10b981', '#f59e0b', '#fcd34d', '#059669', '#d97706', '#ffffff', '#6ee7b7']}
          gravity={0.2}
        />
      )}

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-dvh flex flex-col items-center justify-center px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-primary-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* ══════════════════ SCRATCH VIEW ══════════════════ */}
        {!prizeRevealed && (
          <div className="w-full max-w-md text-center animate-slide-up">
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/20 mb-4">
                <Gift className="w-4 h-4 text-gold-400" />
                <span className="text-gold-400 text-sm font-medium">
                  Hi {state?.user?.name?.split(' ')[0]}! Your prize is waiting
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold text-white mb-2">
                {scratchStarted ? 'Keep Scratching!' : 'Scratch Your Card'}
              </h1>
              <p className="text-primary-300 text-sm">
                {scratchStarted
                  ? scratchMutation.isPending
                    ? 'Assigning your prize…'
                    : `Scratch ${SCRATCH_THRESHOLD}% to reveal your prize!`
                  : 'Tap the card below and scratch to reveal your prize'}
              </p>
            </div>

            {/* Progress bar */}
            {scratchStarted && (
              <div className="mb-4 px-2">
                <div className="flex justify-between text-xs text-primary-400 mb-1.5">
                  <span>Scratch progress</span>
                  <span className="font-bold text-white">{scratchPercent}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.min(100, (scratchPercent / SCRATCH_THRESHOLD) * 100)}%`,
                      background:
                        scratchPercent >= SCRATCH_THRESHOLD
                          ? 'linear-gradient(90deg, #10b981, #6ee7b7)'
                          : 'linear-gradient(90deg, #d97706, #fbbf24)',
                    }}
                  />
                </div>
                {scratchPercent < SCRATCH_THRESHOLD && (
                  <p className="text-xs text-primary-500 mt-1 text-right">
                    {SCRATCH_THRESHOLD - scratchPercent}% more to go
                  </p>
                )}
              </div>
            )}

            {/* Card container */}
            <div
              className="glass rounded-3xl p-5 mb-5 cursor-pointer select-none"
              onClick={() => {
                if (!scratchStarted) setScratchStarted(true);
              }}
            >
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{ width: '100%', paddingBottom: '58%' }}
              >
                {/* Prize underneath the foil */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl">
                  {scratchMutation.isPending || (!coupon && scratchStarted) ? (
                    <LoadingSpinner size="md" message="Drawing your prize…" />
                  ) : coupon && prizeRevealed ? (
                    <div className="text-center px-4">
                      <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-2">
                        <Trophy className="w-6 h-6 text-gold-400" />
                      </div>
                      <p className="text-white font-bold text-base leading-tight">{coupon.prize}</p>
                      <p className="text-primary-400 text-xs mt-1 font-mono">{coupon.couponNo}</p>
                    </div>
                  ) : (
                    /* Placeholder while scratching but not yet revealed */
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl shimmer-gold flex items-center justify-center animate-pulse-gold">
                        <span className="text-3xl opacity-50">🎁</span>
                      </div>
                      <p className="text-white/50 text-xs font-medium">
                        {scratchStarted ? 'Keep scratching...' : 'Tap to start scratching'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Canvas gold foil overlay */}
                {scratchStarted && !prizeRevealed && (
                  <ScratchCard
                    width={640}
                    height={372}
                    brushSize={35} // Approximately 30px as requested for realistic feel
                    threshold={SCRATCH_THRESHOLD}
                    onProgress={handleProgress}
                    onComplete={handleScratchComplete}
                    disabled={false}
                  />
                )}

                {/* "Tap to scratch" hint (before started) */}
                {!scratchStarted && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-700 via-yellow-500 to-amber-700">
                    <div className="text-center">
                      <Sparkles className="w-8 h-8 text-amber-200 mx-auto mb-2 animate-bounce" />
                      <p className="text-amber-100 font-bold text-lg">✦ TAP TO SCRATCH ✦</p>
                      <p className="text-amber-200/70 text-xs mt-1">Your prize awaits inside</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!scratchStarted && (
              <button
                id="btn-scratch-start"
                onClick={() => setScratchStarted(true)}
                className="btn-gold w-full py-4 text-lg"
              >
                <Gift className="w-5 h-5" />
                Tap to Scratch & Win!
              </button>
            )}
          </div>
        )}

        {/* ══════════════════ PRIZE REVEAL VIEW ══════════════════ */}
        {prizeRevealed && coupon && (
          <div className="w-full max-w-md animate-scale-in space-y-4">
            {/* Winner badge */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4 shadow-gold-glow animate-float">
                <Trophy className="w-10 h-10 text-primary-950" />
              </div>
              <h1 className="font-display text-4xl font-black text-gradient-gold mb-1">
                Congratulations!
              </h1>
              <p className="text-primary-300 text-sm">{state?.user?.name}, you've won!</p>
            </div>

            {/* Prize card */}
            <div className="glass rounded-3xl p-7 border border-gold-500/20 shadow-gold-glow">
              <p className="text-gold-400 text-xs font-semibold tracking-widest uppercase text-center mb-3">
                🎁 Your Prize
              </p>
              <h2 className="font-display text-2xl font-bold text-white text-center mb-5 leading-snug">
                {coupon.prize}
              </h2>

              <div className="border-t border-white/10 mb-5" />

              {/* Details grid */}
              <div className="space-y-3 mb-5">
                <DetailRow icon={Hash}     label="Coupon Number" value={coupon.couponNo} mono />
                <DetailRow icon={User}     label="Name"          value={state?.user?.name} />
                <DetailRow icon={Phone}    label="Mobile"        value={state?.user?.phone} />
                {state?.user?.city && (
                  <DetailRow icon={MapPin} label="City"          value={state.user.city} />
                )}
                <DetailRow icon={Calendar} label="Valid Until"   value={fmtDate(coupon.expiryDate)} />
              </div>

              {/* QR Code — encodes full receipt JSON */}
              <div className="flex flex-col items-center gap-2 mt-4" ref={qrRef}>
                <div className="p-3 bg-white rounded-2xl shadow-lg inline-block">
                  <QRCodeSVG
                    value={qrValue}
                    size={140}
                    fgColor="#047857"
                    bgColor="#ffffff"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-white/30 text-xs text-center">
                  Scan QR to view full receipt details
                </p>
              </div>
            </div>

            {/* Download PDF button */}
            <button
              id="btn-download-pdf"
              onClick={handleDownloadPDF}
              className="btn-gold w-full py-3.5 text-base"
            >
              <Download className="w-5 h-5" />
              Download Receipt as PDF
            </button>

            {/* Instructions */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <p className="text-white text-sm font-semibold">How to Redeem</p>
              </div>
              <ul className="space-y-1.5 text-primary-300 text-xs leading-relaxed">
                <li>• Show this screen or downloaded PDF at the lab reception</li>
                <li>• Receptionist will scan the QR code to verify</li>
                <li>• Provide your registered mobile number</li>
                <li>• Coupon is valid for one use only — non-transferable</li>
                <li>• Visit before the expiry date shown above</li>
              </ul>
            </div>

            <button
              id="btn-back-home"
              onClick={() => navigate('/')}
              className="btn-primary w-full py-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small detail row component ──
function DetailRow({
  icon: Icon, label, value, mono,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary-800/60 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary-400" />
      </div>
      <div className="min-w-0">
        <p className="text-white/40 text-xs">{label}</p>
        <p className={`text-white font-semibold text-sm truncate ${mono ? 'font-mono' : ''}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}
