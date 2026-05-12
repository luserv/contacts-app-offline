import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BirthdayNotificationSettings {
  enabled: boolean;
  daysBefore: number;          // 0 = mismo día, 1 = un día antes, etc.
  hour: number;                // 0-23
  minute: number;              // 0-59
  messageTemplate?: string;    // soporta {name} y {days}
}

export const DEFAULT_NOTIFICATION_SETTINGS: BirthdayNotificationSettings = {
  enabled: true,
  daysBefore: 1,
  hour: 9,
  minute: 0,
  messageTemplate: undefined,
};

const STORAGE_KEY = 'birthday_notification_settings';

export async function loadNotificationSettings(): Promise<BirthdayNotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<BirthdayNotificationSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.enabled,
      daysBefore: clampInt(parsed.daysBefore, 0, 365, DEFAULT_NOTIFICATION_SETTINGS.daysBefore),
      hour: clampInt(parsed.hour, 0, 23, DEFAULT_NOTIFICATION_SETTINGS.hour),
      minute: clampInt(parsed.minute, 0, 59, DEFAULT_NOTIFICATION_SETTINGS.minute),
      messageTemplate: parsed.messageTemplate?.trim() ? parsed.messageTemplate : undefined,
    };
  } catch (e) {
    console.error('loadNotificationSettings error:', e);
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export async function saveNotificationSettings(settings: BirthdayNotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('saveNotificationSettings error:', e);
  }
}

function clampInt(v: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  const n = Math.round(v);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Construye el cuerpo de la notificación a partir de la plantilla.
 * Reemplaza {name} y {days}. Si la plantilla está vacía, usa el default.
 */
export function buildNotificationBody(
  template: string | undefined,
  name: string,
  daysBefore: number,
  defaults: { sameDay: string; oneDay: string; nDays: (n: number) => string }
): string {
  if (template && template.trim()) {
    return template
      .replace(/\{name\}/g, name)
      .replace(/\{days\}/g, String(daysBefore));
  }
  if (daysBefore === 0) return defaults.sameDay.replace(/\{name\}/g, name);
  if (daysBefore === 1) return defaults.oneDay.replace(/\{name\}/g, name);
  return defaults.nDays(daysBefore).replace(/\{name\}/g, name);
}
