/** Strip prices and currency tokens that leak into barcode/label food names. */
export function sanitizeFoodName(name: string): string {
  const cleaned = name
    .replace(/[₹$€£]\s*\d+(?:[.,]\d+)?/g, ' ')
    .replace(/\b(?:rs|inr|usd|eur|gbp)\s*\.?\s*\d+(?:[.,]\d+)?\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:rs|inr|usd|eur|gbp)\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:rupees?|dollars?|euros?|pounds?)\b/gi, ' ')
    .replace(/\s*[–—-]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : name.trim();
}
