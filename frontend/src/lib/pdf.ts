import { jsPDF } from 'jspdf';

export interface ReceiptData {
  couponNo: string;
  prize: string;
  metadata?: any;
  holderName: string;
  holderPhone: string;
  holderCity: string;
  scratchedOn: string;
  expiryDate: string;
  campaignName: string;
  labName: string;
}

export function generatePDF(receipt: ReceiptData, qrDataUrl: string, action: 'save' | 'bloburl' = 'save') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN        = 15;
  const FOOTER_RESERVE = 20;

  const ensureSpace = (cy: number, needed: number): number => {
    if (cy + needed > H - FOOTER_RESERVE) {
      doc.addPage();
      return 14;
    }
    return cy;
  };

  // Header
  doc.setFillColor(4, 120, 87);
  doc.rect(0, 0, W, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DBL Pathology Lab', W / 2, 18, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Every Test, A Story Of Health', W / 2, 26, { align: 'center' });

  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 33, W - MARGIN, 33);

  // Title & Prize
  let cy = 49;
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SCRATCH CARD REWARD RECEIPT', W / 2, cy, { align: 'center' });

  cy += 8;
  const meta = receipt.metadata || {};
  const showMinimumBilling = meta.showMinimumBilling === true;

  const tmpPrize = document.createElement('div');
  tmpPrize.innerHTML = String(receipt.prize);
  const plainPrize = tmpPrize.textContent || tmpPrize.innerText || '';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const prizeLines = doc.splitTextToSize(plainPrize, W - 50);
  const prizeLinesHeight = prizeLines.length * 6;

  let minBillingLines: string[] = [];
  let minBillingHeight = 0;
  if (showMinimumBilling) {
    const minimumBillingText = `Discount applicable only on a minimum billing of Rs. ${meta.minimumBilling || 0}.`;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    minBillingLines = doc.splitTextToSize(minimumBillingText, W - 50);
    minBillingHeight = minBillingLines.length * 4.5; 
  }

  const paddingY = 6;
  const innerSpacing = 3;
  let contentHeight = prizeLinesHeight;
  if (showMinimumBilling) {
    contentHeight += innerSpacing + minBillingHeight;
  }
  const prizeBoxH = Math.max(contentHeight + (paddingY * 2), showMinimumBilling ? 28 : 20);

  cy = ensureSpace(cy, prizeBoxH + 4);
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, cy, W - MARGIN * 2, prizeBoxH, 3, 3, 'FD');

  doc.setTextColor(146, 64, 14);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  let currentTextY = cy + paddingY + 4;
  prizeLines.forEach((line: string) => {
    doc.text(line, W / 2, currentTextY, { align: 'center' });
    currentTextY += 6;
  });

  if (showMinimumBilling) {
    currentTextY += innerSpacing - 2;
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'normal');
    minBillingLines.forEach((line: string) => {
      doc.text(line, W / 2, currentTextY, { align: 'center' });
      currentTextY += 4.5;
    });
  }

  cy += prizeBoxH + 5;

  // Coupon Number
  cy = ensureSpace(cy, 16);
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(MARGIN, cy, W - MARGIN * 2, 14, 2, 2, 'FD');

  doc.setTextColor(4, 120, 87);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Coupon Number: ${receipt.couponNo}`, W / 2, cy + 9.5, { align: 'center' });

  cy += 19;

  // Holder Details
  const rows: [string, string][] = [
    ['Patient Name',  receipt.holderName],
    ['Mobile Number', receipt.holderPhone],
    ['City',          receipt.holderCity || '—'],
    ['Issue Date',    receipt.scratchedOn],
    ['Expiry Date',   receipt.expiryDate],
  ];
  const ROW_H = 8;
  const holderBlockH = 10 + rows.length * ROW_H + 4;
  cy = ensureSpace(cy, holderBlockH + 8);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HOLDER DETAILS', MARGIN, cy);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, cy + 3.5, W - MARGIN, cy + 3.5);

  const detailsStartY = cy;
  doc.setFontSize(9.5);
  rows.forEach(([label, value], i) => {
    const rowY = cy + 11 + i * ROW_H;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(label, MARGIN + 1, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(value, 62, rowY);
  });

  if (qrDataUrl) {
    const qrSize = 38;
    const qrX = W - MARGIN - qrSize;
    doc.addImage(qrDataUrl, 'PNG', qrX, detailsStartY + 4, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan to verify', qrX + qrSize / 2, detailsStartY + 4 + qrSize + 4, { align: 'center' });
  }

  cy += holderBlockH + 6;

  const instructions = [
    '1. Visit DBL Pathology Lab before expiry.',
    '2. Show this receipt or QR to reception.',
    '3. Provide registered mobile number.',
    '4. Valid for ONE use, non-transferable.',
  ];

  const terms: string[] = [];
  const highlightedRules: string[] = [];

  if (showMinimumBilling) {
    const filterText = `Discount applicable only on a minimum billing of ₹${meta.minimumBilling || 0}.`;
    highlightedRules.push(filterText.toLowerCase());
  }

  if (meta.nextVisitOnly) {
    const nextVisitText = 'Discount vouchers applicable on next visit only.';
    terms.push(nextVisitText);
    highlightedRules.push(nextVisitText.toLowerCase());
  }

  if (meta.terms) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(meta.terms);
    const plainText = tmp.textContent || tmp.innerText || '';
    
    const lines = plainText.replace(/\\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lines.forEach(line => {
      if (!highlightedRules.includes(line.toLowerCase())) {
        terms.push(line);
      }
    });
  }

  const gap  = 8;
  const colW = (W - 2 * MARGIN - gap) / 2;
  const leftX  = MARGIN;
  const rightX = MARGIN + colW + gap;

  const COL_ROW_H = 5.5;

  let leftTotalLines = 0;
  instructions.forEach(inst => {
    leftTotalLines += doc.splitTextToSize(inst, colW - 8).length;
  });

  let rightTotalLines = 0;
  terms.forEach(term => {
    rightTotalLines += doc.splitTextToSize(`• ${term}`, colW - 8).length;
  });

  const leftH  = 14 + leftTotalLines * COL_ROW_H + 4;
  const rightH = 14 + rightTotalLines * COL_ROW_H + 4;
  const blockH = Math.max(leftH, rightH);

  cy = ensureSpace(cy, blockH + 6);

  // Left Column
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, cy, colW, blockH, 2, 2, 'FD');

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('HOW TO REDEEM', leftX + 4, cy + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  let currentLeftY = cy + 13;
  instructions.forEach((inst) => {
    const lines = doc.splitTextToSize(inst, colW - 8);
    doc.text(lines, leftX + 4, currentLeftY);
    currentLeftY += lines.length * COL_ROW_H;
  });

  // Right Column
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightX, cy, colW, blockH, 2, 2, 'FD');

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', rightX + 4, cy + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  let currentRightY = cy + 13;
  terms.forEach((term) => {
    const lines = doc.splitTextToSize(`• ${term}`, colW - 8);
    doc.text(lines, rightX + 4, currentRightY);
    currentRightY += lines.length * COL_ROW_H;
  });

  cy += blockH + 5;

  const footerY = Math.max(cy + 4, H - 16);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, footerY - 5, W - MARGIN, footerY - 5);

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Every Test, A Story Of Health', W / 2, footerY + 2, { align: 'center' });

  if (action === 'save') {
    doc.save(`DBL-Coupon-${receipt.couponNo}.pdf`);
  } else {
    return doc.output('bloburl');
  }
}
