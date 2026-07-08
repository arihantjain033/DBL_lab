import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Synchronously detect mobile to avoid re-renders
  const [isMobile] = useState(() => 
    typeof navigator !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  // Handle history, back button, ESC key, and body scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Push a state into history so the browser back button can be intercepted
    // Check if it's already there to prevent React 18 StrictMode double-push bugs
    if (!window.history.state?.scannerOpen) {
      window.history.pushState({ ...window.history.state, scannerOpen: true }, '');
    }

    const handlePopState = () => {
      onClose(); // Actually unmount the component
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.history.back(); // Triggers popstate
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      // We do NOT call window.history.back() here to avoid React 18 StrictMode unmount race conditions.
    };
  }, [onClose]);

  const handleManualClose = () => {
    window.history.back();
  };

  const onScanSuccess = useRef((decodedText: string) => {
    onScan(decodedText);
    window.history.back();
  });

  useEffect(() => {
    onScanSuccess.current = (decodedText: string) => {
      onScan(decodedText);
      window.history.back();
    };
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;
    let html5QrCode: Html5Qrcode | null = null;
    let startPromise: Promise<any> | null = null;

    const setupScanner = async () => {
      setIsInitializing(true);
      setError('');
      try {
        html5QrCode = new Html5Qrcode('qr-reader', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });

        if (!isMounted) return;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        const internalScanSuccess = (decodedText: string) => {
          if (!isMounted) return;
          isMounted = false; // Prevent multiple consecutive triggers
          onScanSuccess.current(decodedText);
        };

        if (isMobile) {
          // Mobile: Try environment camera first
          try {
            startPromise = html5QrCode.start({ facingMode: "environment" }, config, internalScanSuccess, () => {});
            await startPromise;
          } catch (e) {
            if (!isMounted) return;
            // Fallback to front camera if environment fails
            startPromise = html5QrCode.start({ facingMode: "user" }, config, internalScanSuccess, () => {});
            await startPromise;
          }
        } else {
          // Desktop: Enumerate devices
          const devices = await Html5Qrcode.getCameras();
          if (!isMounted) return;

          if (devices && devices.length > 0) {
            setCameras(devices);
            
            let defaultCameraId = devices[0].id;
            // Safely guess main camera just in case
            for (const d of devices) {
              const lower = (d.label || '').toLowerCase();
              if (lower.includes('front') || lower.includes('integrated') || lower.includes('facetime')) {
                defaultCameraId = d.id;
                break;
              }
            }

            const targetCameraId = selectedCameraId || defaultCameraId;
            if (!selectedCameraId) setSelectedCameraId(targetCameraId);

            startPromise = html5QrCode.start(targetCameraId, config, internalScanSuccess, () => {});
            await startPromise;
          } else {
            setError('No camera found on this device.');
          }
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        let msg = 'Camera access denied or unavailable.';
        if (err?.name === 'NotAllowedError') msg = 'Permission denied. Please allow camera access in browser settings.';
        else if (err?.name === 'NotFoundError') msg = 'No camera device found.';
        else if (err?.name === 'NotReadableError') msg = 'Camera is already in use by another application.';
        else if (err?.name === 'OverconstrainedError') msg = 'Camera does not support required settings.';
        else if (typeof err === 'string') msg = err;
        else if (err?.message) msg = err.message;
        
        if (isMounted) setError(`Failed to start camera: ${msg}`);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    setupScanner();

    return () => {
      isMounted = false;
      if (html5QrCode) {
        if (startPromise) {
          startPromise.then(() => {
            html5QrCode?.stop().then(() => {
              html5QrCode?.clear();
            }).catch(console.error);
          }).catch(() => {
            try { html5QrCode?.clear(); } catch(e){}
          });
        } else {
          try { html5QrCode?.clear(); } catch(e){}
        }
      }
    };
  }, [selectedCameraId, isMobile]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-primary-950 md:p-4">
      {/* 
        On mobile: Takes full screen without rounded corners.
        On desktop: Max width 600px, rounded corners, shadow.
      */}
      <div className="w-full h-full md:h-auto md:max-w-[600px] bg-primary-950 md:rounded-3xl md:border md:border-white/10 md:shadow-2xl flex flex-col animate-scale-in overflow-hidden">
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5 shrink-0 pt-safe">
          <div className="flex items-center gap-2 text-white font-medium text-lg">
            <Camera className="w-5 h-5 text-primary-400" />
            Scan QR Code
          </div>
          <button 
            onClick={handleManualClose} 
            className="p-3 md:p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-6 h-6 md:w-5 md:h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 relative flex-1 flex flex-col pb-safe">
          {/* Desktop Camera Selector */}
          {!isMobile && cameras.length > 1 && (
            <div className="mb-4">
              <select 
                value={selectedCameraId}
                onChange={e => {
                  setIsInitializing(true);
                  setSelectedCameraId(e.target.value);
                }}
                className="input-field text-sm w-full bg-black/50"
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                ))}
              </select>
            </div>
          )}

          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-200 text-center max-w-sm px-4">{error}</p>
              <button 
                onClick={() => {
                  setIsInitializing(true);
                  setSelectedCameraId(selectedCameraId); // Force re-render if it's identical? No, better:
                  window.location.reload(); // Simple retry
                }} 
                className="btn-glass mt-4 px-6"
              >
                Reload Page
              </button>
            </div>
          ) : (
            <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-square flex-1 md:flex-none">
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-950 z-10 gap-4">
                  <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
                  <span className="text-white/60 font-medium tracking-wide">Initializing Camera...</span>
                </div>
              )}
              <div id="qr-reader" className="w-full h-full flex items-center justify-center [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
            </div>
          )}
          
          <div className="mt-6 mb-4 shrink-0 text-center space-y-2">
            <p className="text-white/80 font-medium">Point camera at QR code</p>
            <p className="text-white/40 text-xs">It will scan and verify automatically</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
