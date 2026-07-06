import { getPrizeTerms } from '@/lib/terms';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface TermsAndConditionsProps {
  prizeType?: string;
  className?: string;
}

export default function TermsAndConditions({ prizeType, className = '' }: TermsAndConditionsProps) {
  const terms = getPrizeTerms(prizeType);

  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>
      <h3 className="font-display text-lg font-bold text-gold-400 mb-4 flex items-center gap-2">
        Terms & Conditions
      </h3>
      <ul className="space-y-3">
        {terms.map((term, i) => (
          <li
            key={i}
            className={`flex items-start gap-2.5 text-sm ${
              term.isSpecial
                ? 'text-gold-400 font-medium bg-gold-500/10 p-3 rounded-xl border border-gold-500/20'
                : 'text-white/70'
            }`}
          >
            {term.isSpecial ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-gold-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-400" />
            )}
            <span>
              {term.isSpecial && <span className="mr-1">⭐</span>}
              {term.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
