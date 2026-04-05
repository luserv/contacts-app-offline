export interface VCardParsed {
  first_name: string;
  middle_name?: string;
  surname: string;
  birthdate?: string; // DD/MM/YYYY
  phones: { phone: string; label?: string }[];
  emails: { email: string; label?: string }[];
  notes: string[];
  urls: { url: string; label?: string }[];
  org?: { name: string; achievement: string; date?: string };
  identity_card?: { card_number: string };
}

/** Desdobla líneas continuadas (RFC 6350 §3.2) */
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

/** Capitaliza cada palabra: "JUAN CARLOS" → "Juan Carlos" */
function toTitleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/** Convierte YYYYMMDD o YYYY-MM-DD a DD/MM/YYYY */
function parseBday(raw: string): string | undefined {
  const clean = raw.replace(/-/g, '').trim();
  if (clean.length === 8) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    if (!isNaN(Number(y + m + d))) return `${d}/${m}/${y}`;
  }
  return undefined;
}

/** Detecta si el NOTE es una cédula ecuatoriana (10 dígitos) */
function isCedula(s: string): boolean {
  return /^\d{10}$/.test(s.trim());
}

function getLabelFromParams(params: string[]): string | undefined {
  for (const p of params) {
    const v = p.replace(/^TYPE=/i, '').toLowerCase();
    if (v && v !== 'pref' && !v.startsWith('value=')) return v;
  }
  return undefined;
}

export function parseVcf(content: string): VCardParsed[] {
  const unfolded = unfold(content);
  const results: VCardParsed[] = [];

  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1);

  for (const block of blocks) {
    const endIdx = block.search(/END:VCARD/i);
    const lines = block.slice(0, endIdx < 0 ? undefined : endIdx)
      .split(/\r?\n/)
      .filter(l => l.includes(':'));

    // Parsear propiedades
    const props: { key: string; params: string[]; value: string }[] = [];
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1).trim();
      const parts = keyPart.split(';');
      // Normalizar key: quitar prefijos ITEM1. etc.
      const rawKey = parts[0].replace(/^ITEM\d+\./i, '').toUpperCase();
      props.push({ key: rawKey, params: parts.slice(1), value });
    }

    const get = (key: string) => props.find(p => p.key === key)?.value ?? '';
    const getAll = (key: string) => props.filter(p => p.key === key);

    // Nombre estructurado N:surname;given;additional;;;
    let firstName = '';
    let middleName: string | undefined;
    let surname = '';

    const nProp = get('N');
    if (nProp) {
      const parts = nProp.split(';');
      const rawSurname = parts[0]?.trim() ?? '';
      const rawGiven = parts[1]?.trim() ?? '';
      const given = rawGiven.split(/\s+/).filter(Boolean);
      firstName = toTitleCase(given[0] ?? '');
      middleName = given.length > 1 ? toTitleCase(given.slice(1).join(' ')) : undefined;
      surname = toTitleCase(rawSurname);
    }

    // Fallback a FN si N no tiene datos
    if (!firstName && !surname) {
      const fn = get('FN').replace(/;PREF=\d+/g, '').trim();
      const words = fn.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        firstName = toTitleCase(words[0]);
        surname = toTitleCase(words.slice(1).join(' '));
      } else {
        firstName = toTitleCase(fn) || 'Sin nombre';
        surname = '-';
      }
    }

    if (!firstName) continue; // saltar vCards vacías

    // Fecha de nacimiento
    const birthdate = parseBday(get('BDAY'));

    // Teléfonos
    const phones = getAll('TEL').map(p => ({
      phone: p.value.replace(/\s+/g, '').trim(),
      label: getLabelFromParams(p.params),
    })).filter(p => p.phone);

    // Emails
    const emails = getAll('EMAIL').map(p => ({
      email: p.value.trim(),
      label: getLabelFromParams(p.params),
    })).filter(e => e.email);

    // URLs
    const urls = getAll('URL').map(p => ({
      url: p.value.trim(),
      label: getLabelFromParams(p.params),
    })).filter(u => u.url);

    // NOTEs: separar cédula del resto
    let identity_card: { card_number: string } | undefined;
    const notes: string[] = [];
    for (const n of getAll('NOTE')) {
      const val = n.value.replace(/\\n/g, '\n').trim();
      if (!val) continue;
      if (isCedula(val) && !identity_card) {
        identity_card = { card_number: val };
      } else {
        notes.push(val);
      }
    }

    // ORG: "Nombre\, cargo, fecha" o solo "Nombre"
    let org: VCardParsed['org'];
    const orgVal = get('ORG');
    if (orgVal) {
      // Restaurar comas escapadas temporalmente
      const normalized = orgVal.replace(/\\,/g, '\u0000');
      const parts = normalized.split(',').map(s => s.replace(/\u0000/g, ',').trim());
      const orgName = toTitleCase(parts[0]);
      const achievement = parts[1] ? toTitleCase(parts[1]) : 'Miembro';
      const date = parts[2]?.match(/\d{4}-\d{2}-\d{2}/) ? parts[2].trim() : undefined;
      if (orgName) org = { name: orgName, achievement, date };
    }

    results.push({
      first_name: firstName,
      middle_name: middleName || undefined,
      surname,
      birthdate,
      phones,
      emails,
      notes,
      urls,
      org,
      identity_card,
    });
  }

  return results;
}
