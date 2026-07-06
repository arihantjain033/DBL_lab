import { useNavigate } from 'react-router-dom';
import { QrCode, ShieldOff } from 'lucide-react';
import { clearSession } from '@/lib/scratchSession';

export default function SessionExpiredPage() {
  const navigate = useNavigate();

  const handleScanAgain = () => {
    // Clear session so a fresh scan can start
    clearSession();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-dvh relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-forest-950 flex items-center justify-center px-4 py-12">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-800/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-glass text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-700/60 to-primary-900/60 border border-primary-600/30 shadow-glow">
              <ShieldOff className="w-10 h-10 text-primary-300" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
              Session Completed
            </h1>
            <p className="text-primary-300 text-sm md:text-base leading-relaxed">
              Your scratch card has already been used.
            </p>
            <p className="text-primary-400 text-sm mt-2 leading-relaxed">
              To participate again, please scan the official QR code.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Scan Again */}
          <button
            id="btn-scan-again"
            onClick={handleScanAgain}
            className="btn-gold w-full py-3.5 text-base gap-2"
          >
            <QrCode className="w-5 h-5" />
            Scan Again
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-primary-600 text-xs mt-6">
          © {new Date().getFullYear()} DBL Pathology Lab · All rights reserved
        </p>
      </div>
    </div>
  );
}
