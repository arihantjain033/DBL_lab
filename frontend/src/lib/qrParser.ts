export function extractCouponNo(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let str = input.trim();

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(str);
    if (parsed.coupon) {
      str = String(parsed.coupon);
    } else if (parsed.couponNo) {
      str = String(parsed.couponNo);
    } else if (parsed.verify) {
      str = String(parsed.verify);
    }
  } catch (e) {
    // Not valid JSON, proceed to treat as raw string
  }

  // Try parsing as URL or partial path
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      const url = new URL(str);
      const parts = url.pathname.split('/').filter(Boolean);
      // Expected path: /verify/DBL-0009
      if (parts.length > 0) {
        str = parts[parts.length - 1];
      }
    } else if (str.includes('/verify/')) {
      // Handle edge cases like domain.com/verify/DBL-0009
      const parts = str.split('/verify/');
      if (parts.length >= 2) {
        // Grab everything after /verify/, stop at query/hash
        str = parts[1].split('?')[0].split('#')[0].split('/')[0];
      }
    }
  } catch (e) {
    // URL parsing failed, fall back to whatever string we have
  }

  // Final cleanup: remove any characters that aren't letters, numbers, or hyphens
  let result = str.trim().toUpperCase();
  result = result.replace(/[^A-Z0-9-]/g, '');
  
  return result;
}
