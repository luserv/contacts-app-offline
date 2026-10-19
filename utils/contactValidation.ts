const PHONE_CHARS = /^\+?[\d\s().-]+$/;
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Digits plus common separators, optional leading '+', 6 to 15 digits (E.164 maximum). */
export function isValidPhone(raw: string): boolean {
  const text = String(raw ?? '').trim();
  if (!PHONE_CHARS.test(text)) return false;
  const digits = text.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

export function isValidEmail(raw: string): boolean {
  return EMAIL.test(String(raw ?? '').trim());
}
