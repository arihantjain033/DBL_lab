export interface Term {
  text: string;
  isSpecial?: boolean;
}

export function getPrizeTerms(metadata?: any): Term[] {
  const terms: Term[] = [];

  if (!metadata) return terms;

  const highlightedTerms: string[] = [];

  if (metadata.showMinimumBilling && metadata.minimumBilling !== null && metadata.minimumBilling !== undefined) {
    const text = `Discount applicable only on a minimum billing of ₹${metadata.minimumBilling}.`;
    terms.push({ text, isSpecial: true });
    highlightedTerms.push(text.toLowerCase());
  }

  if (metadata.nextVisitOnly) {
    const text = 'Discount vouchers applicable on next visit only.';
    terms.push({ text, isSpecial: true });
    highlightedTerms.push(text.toLowerCase());
  }

  if (metadata.terms) {
    const lines = String(metadata.terms).replace(/\\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lines.forEach(line => {
      if (!highlightedTerms.includes(line.toLowerCase())) {
        terms.push({ text: line, isSpecial: false });
      }
    });
  }

  return terms;
}
