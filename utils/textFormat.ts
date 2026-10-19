const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'of', 'the', 'and', 'for']);

/** Display form for proper names stored in uppercase (organizations, banks): "BANCO DE LA NACIÓN" -> "Banco de la Nación". */
export function toTitleDisplay(s: string | null | undefined): string {
  const text = s?.trim();
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && CONNECTORS.has(word)) return word;
      // capitalize the first letter of the word and after an apostrophe or hyphen
      return word.replace(/(^|['’-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
    })
    .join(' ');
}
