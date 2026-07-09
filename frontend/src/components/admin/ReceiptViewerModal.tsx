import { useState, useEffect, useRef } from 'react';
import { X, Download, Printer, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ReceiptData, generatePDF } from '@/lib/pdf';
import { couponApi } from '@/lib/api';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: any;
  campaignName: string;
}

export default function ReceiptViewerModal({ isOpen, onClose, participant, campaignName }: ReceiptViewerModalProps) {
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !participant?.couponNo) {
      setPdfDataUri(null);
      return;
    }

    const generate = async () => {
      setIsGenerating(true);
      try {
        // Fetch complete coupon details to ensure we have the latest metadata (prize_rules)
        const res = await couponApi.verify(participant.couponNo);
        const latestMetadata = res.data?.data?.coupon?.metadata || participant.metadata;

        // Wait a frame for the QR code to be rendered in the hidden div
        await new Promise((r) => setTimeout(r, 50));

        let qrDataUrl = '';
        if (qrRef.current) {
          const svg = qrRef.current.querySelector('svg');
          if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            qrDataUrl = await new Promise((resolve) => {
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
              };
              img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            });
          }
        }

        const dateFmt = (d: string) => {
          if (!d) return '—';
          return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        const receiptData: ReceiptData = {
          couponNo: participant.couponNo,
          prize: participant.prize,
          metadata: latestMetadata,
          holderName: participant.userName,
          holderPhone: participant.userPhone,
          holderCity: participant.userCity || '—',
          scratchedOn: dateFmt(participant.assignedAt),
          expiryDate: dateFmt(participant.expiryDate),
          campaignName: campaignName,
          labName: 'DBL Pathology Lab',
        };

        const uri = generatePDF(receiptData, qrDataUrl, 'bloburl') as any;
        if (typeof uri === 'string') {
           setPdfDataUri(uri);
        } else if (uri && typeof uri.toString === 'function') {
           setPdfDataUri(uri.toString());
        }
      } catch (err) {
        console.error('Failed to generate PDF preview:', err);
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [isOpen, participant, campaignName]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!participant || !pdfDataUri) return;
    const a = document.createElement('a');
    a.href = pdfDataUri;
    a.download = `DBL-Coupon-${participant.couponNo}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!pdfDataUri) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfDataUri;
    document.body.appendChild(iframe);
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up after print dialog
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-[90vw] h-[90vh] max-w-5xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">View Receipt</h2>
              <p className="text-sm text-white/50">{participant?.couponNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!pdfDataUri}
              className="px-3 py-2 text-sm font-medium text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!pdfDataUri}
              className="px-3 py-2 text-sm font-medium text-black bg-primary-500 hover:bg-primary-400 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white/5 relative min-h-[400px]">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white/70">Generating secure preview...</p>
            </div>
          ) : pdfDataUri ? (
            isMobileDevice ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <FileText className="w-16 h-16 text-primary-500/50 mb-8" />
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    onClick={() => window.open(pdfDataUri, '_blank')}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-400 text-black font-semibold rounded-xl transition-colors"
                  >
                    Open PDF 
                  </button>
                  <button
                    onClick={handleDownload}
                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors"
                  >
                    Download File
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={`${pdfDataUri}#view=FitH`}
                className="w-full h-full border-0 rounded-b-2xl"
                title="Receipt Preview"
              />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-red-400">Failed to load preview</p>
            </div>
          )}
        </div>

        {/* Hidden QR Code for generation */}
        {participant?.couponNo && (
          <div className="hidden" ref={qrRef}>
            <QRCodeSVG
              value={JSON.stringify({
                lab: 'DBL Pathology Lab',
                coupon: participant.couponNo,
                prize: participant.prize,
                holder: participant.userName,
                phone: participant.userPhone,
                validUntil: participant.expiryDate ? new Date(participant.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'No Expiry',
              })}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
