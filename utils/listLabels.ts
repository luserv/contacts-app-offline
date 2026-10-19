type Lang = 'es' | 'en';
type Kind = 'marital' | 'relationship';

// The lookup tables store Spanish labels. These maps translate by id at display time,
// so existing databases keep working without a migration.
const LABELS: Record<Kind, Record<Lang, Record<string, string>>> = {
  marital: {
    es: {
      soltero: 'Soltero/a', casado: 'Casado/a', divorciado: 'Divorciado/a',
      viudo: 'Viudo/a', union_libre: 'Unión libre', separado: 'Separado/a',
    },
    en: {
      soltero: 'Single', casado: 'Married', divorciado: 'Divorced',
      viudo: 'Widowed', union_libre: 'Domestic partnership', separado: 'Separated',
    },
  },
  relationship: {
    es: {
      padre: 'Padre', madre: 'Madre', hijo: 'Hijo', hija: 'Hija',
      hermano: 'Hermano', hermana: 'Hermana', tio: 'Tío', tia: 'Tía',
      sobrino: 'Sobrino', sobrina: 'Sobrina', abuelo: 'Abuelo', abuela: 'Abuela',
      primo: 'Primo', prima: 'Prima', conyuge: 'Cónyuge', nieto: 'Nieto', nieta: 'Nieta',
    },
    en: {
      padre: 'Father', madre: 'Mother', hijo: 'Son', hija: 'Daughter',
      hermano: 'Brother', hermana: 'Sister', tio: 'Uncle', tia: 'Aunt',
      sobrino: 'Nephew', sobrina: 'Niece', abuelo: 'Grandfather', abuela: 'Grandmother',
      primo: 'Cousin (male)', prima: 'Cousin (female)', conyuge: 'Spouse', nieto: 'Grandson', nieta: 'Granddaughter',
    },
  },
};

/** Localized label for a lookup-table id; falls back to the stored label for unknown ids. */
export function listLabel(kind: Kind, lang: Lang, id: string | null | undefined, fallback: string): string {
  return (id && LABELS[kind][lang][id]) || fallback;
}
