import { T } from './i18n';

export const DOC_TYPES = ['Pasaporte', 'Cédula', 'Licencia de conducir', 'Otro'];

/** Normaliza texto para almacenamiento en BD: recorta y convierte a MAYÚSCULAS. Retorna null si está vacío. */
export function toUpper(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t.toUpperCase() : null;
}

/** Normaliza texto para mostrar: primera letra mayúscula, resto minúsculas. */
export function toDisplay(s: string | null | undefined): string {
  if (!s) return '';
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export const DOCS_WITH_DATES = ['Licencia de conducir', 'Pasaporte'];

export const EXCLUDED_FIELDS = [
  'contact_id', 'first_name', 'middle_name', 'surname',
  'status_id', 'gender', 'created_at', 'updated_at',
];

export interface ContactDetail {
  contact_id: string;
  first_name: string;
  middle_name?: string;
  surname: string;
  birthdate?: string;
  gender?: string;
  status_id?: string;
  [key: string]: any;
}

export type ZodiacKey = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' |
  'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

const ZODIAC_SYMBOLS: Record<ZodiacKey, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

export function getZodiacKey(birthdate?: string): ZodiacKey | null {
  if (!birthdate) return null;
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  if (isNaN(day) || isNaN(month) || month < 1 || month > 12 || day < 1) return null;
  const md = month * 100 + day;
  if (md >= 1222 || md <= 119) return 'capricorn';
  if (md <= 218) return 'aquarius';
  if (md <= 320) return 'pisces';
  if (md <= 419) return 'aries';
  if (md <= 520) return 'taurus';
  if (md <= 620) return 'gemini';
  if (md <= 722) return 'cancer';
  if (md <= 822) return 'leo';
  if (md <= 922) return 'virgo';
  if (md <= 1022) return 'libra';
  if (md <= 1121) return 'scorpio';
  return 'sagittarius';
}

export function getZodiacSymbol(birthdate?: string): string | null {
  const key = getZodiacKey(birthdate);
  return key ? ZODIAC_SYMBOLS[key] : null;
}

export function formatDate(text: string, setter: (v: string) => void) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  let formatted = digits;
  if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  setter(formatted);
}

export function edadEnFecha(birthdate: string, targetDate: string): { years: number; months: number; days: number } | null {
  const bp = birthdate.split('/');
  const tp = targetDate.split('/');
  if (bp.length !== 3 || tp.length !== 3) return null;
  const [bd, bm, by] = bp.map(Number);
  const [td, tm, ty] = tp.map(Number);
  if (!bd || !bm || !by || !td || !tm || !ty) return null;

  let years = ty - by;
  let months = tm - bm;
  let days = td - bd;

  if (days < 0) {
    months--;
    days += new Date(ty, tm - 1, 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return null;
  return { years, months, days };
}

export function calcularEdad(birthdate: string, age: T['age']): string | null {
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;

  const hoy = new Date();
  const nacimiento = new Date(year, month - 1, day);
  if (isNaN(nacimiento.getTime()) || nacimiento > hoy) return null;

  let años = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();
  let dias = hoy.getDate() - nacimiento.getDate();

  if (dias < 0) {
    meses -= 1;
    dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  }
  if (meses < 0) { años -= 1; meses += 12; }

  const partes: string[] = [];
  if (años > 0) partes.push(age.years(años));
  if (meses > 0) partes.push(age.months(meses));
  if (dias > 0) partes.push(age.days(dias));
  if (partes.length === 0) return age.today;
  return partes.join(', ');
}
