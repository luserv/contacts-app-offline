export interface ContactListItem {
  contact_id: string;
  first_name: string;
  surname: string;
  middle_name?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  [key: string]: any;
}

export type SortKey = 'first_name' | 'surname' | 'age_asc' | 'age_desc' | 'insertion_desc' | 'insertion_asc';
export type GenderFilter = 'MALE' | 'FEMALE' | 'UNSPECIFIED' | null;
export type CedulaFilterMode = 'all' | 'with' | 'without';
export type CedulaFilter = { mode: CedulaFilterMode };

// Backward-compat alias
export type DocumentFilterMode = CedulaFilterMode;
export type DocumentFilter = CedulaFilter;

export type OrganizationFilterMode = 'all' | 'with' | 'without' | 'specific';
export type OrganizationFilter = {
  mode: OrganizationFilterMode;
  organizationId?: string;
};

export type MaritalStatusFilterMode = 'all' | 'with' | 'without' | 'specific';
export type MaritalStatusFilter = {
  mode: MaritalStatusFilterMode;
  statusId?: string;
};

export type SearchFilter =
  | { type: 'age'; op: 'eq' | 'gt' | 'lt' | 'gte' | 'lte'; value: number }
  | { type: 'text'; value: string };

type AgeOp = Extract<SearchFilter, { type: 'age' }>['op'];

export const DOC_TYPES = ['Passport', 'ID Card', "Driver's License", 'Other'] as const;
export const DOC_TYPES_KEYS = ['docPassport', 'docIdCard', 'docDriversLicense', 'docOther'] as const;

export const SORT_OPTIONS: { key: SortKey; transKey: string }[] = [
  { key: 'first_name', transKey: 'sortFirstName' },
  { key: 'surname', transKey: 'sortSurname' },
  { key: 'age_desc', transKey: 'sortAgeDesc' },
  { key: 'age_asc', transKey: 'sortAgeAsc' },
  { key: 'insertion_desc', transKey: 'sortInsertionDesc' },
  { key: 'insertion_asc', transKey: 'sortInsertionAsc' },
];

export function getGenderFilterOptions(t: any): { value: GenderFilter; label: string }[] {
  return [
    { value: null, label: t.contacts.all },
    { value: 'MALE', label: t.contacts.male },
    { value: 'FEMALE', label: t.contacts.female },
    { value: 'UNSPECIFIED', label: t.contacts.noGender },
  ];
}

export function parseBirthdateToAge(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;

  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

export function formatFullAge(birthdate?: string | null): string | null {
  if (!birthdate) return null;
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;

  const today = new Date();
  let years = today.getFullYear() - y;
  let months = today.getMonth() + 1 - m;
  let days = today.getDate() - d;

  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts2: string[] = [];
  if (years > 0) parts2.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts2.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0) parts2.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  return parts2.length > 0 ? parts2.join(', ') : '0 days';
}

export function parseSearchFilter(query: string): SearchFilter {
  const trimmed = query.trim();
  const m = trimmed.match(/^age:(>=|<=|>|<)?(\d+)$/i);

  if (m) {
    const opStr = m[1] ?? '';
    const value = parseInt(m[2], 10);
    const op = opStr === '>=' ? 'gte' : opStr === '<=' ? 'lte' : opStr === '>' ? 'gt' : opStr === '<' ? 'lt' : 'eq';
    return { type: 'age', op, value };
  }

  return { type: 'text', value: trimmed };
}

export function getSearchChips(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return trimmed.split('&').map(part => part.trim()).filter(Boolean).map(part => {
    const filter = parseSearchFilter(part);
    if (filter.type === 'text') return part;

    const opLabel =
      filter.op === 'eq' ? '' :
      filter.op === 'gt' ? '>' :
      filter.op === 'lt' ? '<' :
      filter.op === 'gte' ? '≥' : '≤';

    return `Age ${opLabel}${opLabel ? ' ' : ''}${filter.value}`;
  });
}

export function applyAgeFilter(contacts: ContactListItem[], op: AgeOp, value: number): ContactListItem[] {
  return contacts.filter(contact => {
    const age = parseBirthdateToAge(contact.birthdate);
    if (age === null) return false;
    if (op === 'eq') return age === value;
    if (op === 'gt') return age > value;
    if (op === 'lt') return age < value;
    if (op === 'gte') return age >= value;
    if (op === 'lte') return age <= value;
    return false;
  });
}

export function sortContacts(list: ContactListItem[], key: SortKey): ContactListItem[] {
  return [...list].sort((a, b) => {
    if (key === 'first_name') return (a.first_name ?? '').localeCompare(b.first_name ?? '');
    if (key === 'surname') return (a.surname ?? '').localeCompare(b.surname ?? '');

    if (key === 'insertion_desc') return (b.rowid ?? 0) - (a.rowid ?? 0);
    if (key === 'insertion_asc') return (a.rowid ?? 0) - (b.rowid ?? 0);

    const aKey = birthdateToSortKey(a.birthdate);
    const bKey = birthdateToSortKey(b.birthdate);

    if (aKey === null && bKey === null) return 0;
    if (aKey === null) return 1;
    if (bKey === null) return -1;
    return key === 'age_desc' ? aKey - bKey : bKey - aKey;
  });
}

export function filterContactsByGender(list: ContactListItem[], genderFilter: GenderFilter): ContactListItem[] {
  if (genderFilter === 'UNSPECIFIED') {
    return list.filter(contact => !contact.gender);
  }

  if (genderFilter) {
    return list.filter(contact => contact.gender === genderFilter);
  }

  return list;
}

/**
 * Filtra la lista de contactos según si poseen o no una cédula registrada.
 * `cedulaIds` es el conjunto de contact_id que tienen al menos una fila
 * en la tabla national_identity_card con doc_type = 'Cédula'.
 */
export function filterContactsByCedula(
  list: ContactListItem[],
  filter: CedulaFilter,
  cedulaIds: Set<string>
): ContactListItem[] {
  if (!filter || filter.mode === 'all') return list;

  if (filter.mode === 'with') {
    return list.filter(c => cedulaIds.has(c.contact_id));
  }

  if (filter.mode === 'without') {
    return list.filter(c => !cedulaIds.has(c.contact_id));
  }

  return list;
}

// Backward-compat export
export const filterContactsByDocument = filterContactsByCedula;

/**
 * Filtra la lista de contactos según su vinculación con organizaciones.
 * - `orgIds`: contact_id que tienen al menos una organización vinculada.
 * - `specificOrgIds`: contact_id vinculados a la organización seleccionada
 *   (solo se usa cuando `filter.mode === 'specific'`).
 */
export function filterContactsByOrganization(
  list: ContactListItem[],
  filter: OrganizationFilter,
  orgIds: Set<string>,
  specificOrgIds: Set<string>
): ContactListItem[] {
  if (!filter || filter.mode === 'all') return list;

  if (filter.mode === 'with') {
    return list.filter(c => orgIds.has(c.contact_id));
  }

  if (filter.mode === 'without') {
    return list.filter(c => !orgIds.has(c.contact_id));
  }

  if (filter.mode === 'specific') {
    if (!filter.organizationId) return list;
    return list.filter(c => specificOrgIds.has(c.contact_id));
  }

  return list;
}

/**
 * Filtra la lista de contactos según su estado civil.
 * `status_id` viene incluido en cada contacto, por lo que no requiere consulta extra.
 */
export function filterContactsByMaritalStatus(
  list: ContactListItem[],
  filter: MaritalStatusFilter,
): ContactListItem[] {
  if (!filter || filter.mode === 'all') return list;

  if (filter.mode === 'with') {
    return list.filter(c => !!c.status_id);
  }

  if (filter.mode === 'without') {
    return list.filter(c => !c.status_id);
  }

  if (filter.mode === 'specific') {
    if (!filter.statusId) return list;
    return list.filter(c => c.status_id === filter.statusId);
  }

  return list;
}

function birthdateToSortKey(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return y * 10000 + m * 100 + d;
}
