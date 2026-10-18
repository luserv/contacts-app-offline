export const DEFAULT_COUNTRY_CODE = '593';

/** tel: link with formatting stripped; empty when the input has no digits. */
export function telHref(raw: string): string {
  const cleaned = String(raw || '').replace(/[^\d+]/g, '');
  return /\d/.test(cleaned) ? `tel:${cleaned}` : '';
}

/**
 * Digits with country code, as wa.me and t.me expect. Local numbers (leading 0
 * or exactly 9 digits) get the default country code; anything under 8 digits is rejected.
 */
export function whatsappNumber(raw: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  const text = String(raw || '').trim();
  let digits = text.replace(/\D/g, '');
  if (!digits) return '';
  if (text.startsWith('+')) return digits.length >= 8 ? digits : '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith(countryCode) && digits.length >= countryCode.length + 8) { /* already international */ }
  else if (digits.startsWith('0')) digits = countryCode + digits.slice(1);
  else if (digits.length === 9) digits = countryCode + digits;
  return digits.length >= 8 ? digits : '';
}

export function whatsappHref(raw: string, countryCode?: string): string {
  const number = whatsappNumber(raw, countryCode);
  return number ? `https://wa.me/${number}` : '';
}
