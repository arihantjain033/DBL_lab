export interface Term {
  text: string;
  isSpecial?: boolean;
}

export function getPrizeTerms(prizeType?: string): Term[] {
  const commonTerms: Term[] = [
    { text: 'Valid for 6 Months' },
    { text: 'One Scratch Card per Patient' },
    { text: 'Non-transferable' },
    { text: 'Cannot be exchanged for cash' },
    { text: 'Prize must be claimed before expiry' },
    { text: 'Management reserves all rights' },
  ];

  // List of free prizes that DO NOT get the discount condition
  const freePrizes = [
    'Free Full Body Health Check-up',
    'Digital Thermometer',
    'Free Blood Sugar Test',
  ];

  // If no prize is passed, just return common (or we can assume discount for safety, but typically common is better)
  if (!prizeType) return commonTerms;

  // Check if it's a discount prize (i.e. not in the free prizes list)
  const isDiscount = !freePrizes.includes(prizeType);

  if (isDiscount) {
    return [
      ...commonTerms,
      {
        text: 'Discount applicable only on a minimum billing of ₹200.',
        isSpecial: true,
      },
    ];
  }

  return commonTerms;
}
