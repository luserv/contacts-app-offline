import { Platform } from 'react-native';
import { getTranslations } from './i18n';
import {
    BirthdayNotificationSettings,
    buildNotificationBody,
    loadNotificationSettings,
} from './notificationSettings';

const isWeb = Platform.OS === 'web';

// ─── Web / Electron ──────────────────────────────────────────────────────────

async function webRequestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

function showWebNotification(title: string, body: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body });
}

async function checkAndShowBirthdayNotifications() {
    const electronNotif = (window as any).electronNotif;
    if (!electronNotif) return;
    const contacts: { first_name: string; surname: string; birthdate: string }[] =
        await electronNotif.checkBirthdays();
    const tn = (await getTranslations()).birthdayNotif;
    for (const c of contacts) {
        showWebNotification(tn.webTitleTomorrow, tn.webBodyTomorrow(`${c.first_name} ${c.surname}`));
    }
}

// ─── Android / iOS ───────────────────────────────────────────────────────────

type NotificationsModule = typeof import('expo-notifications');
let N: NotificationsModule | null = null;

if (!isWeb) {
    try {
        N = require('expo-notifications') as NotificationsModule;
        N.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    } catch (_) {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const notificationsAvailable = isWeb
    ? (typeof window !== 'undefined' && 'Notification' in window)
    : N !== null;

export async function requestNotificationPermissions(): Promise<boolean> {
    if (isWeb) return webRequestPermission();
    if (!N) return false;
    try {
        if (Platform.OS === 'android') {
            await N.setNotificationChannelAsync('birthdays', {
                name: 'Birthdays',
                importance: N.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
            });
        }
        const { status: existing } = await N.getPermissionsAsync();
        if (existing === 'granted') return true;
        const { status } = await N.requestPermissionsAsync();
        return status === 'granted';
    } catch (_) {
        return false;
    }
}

function parseBirthdate(birthdate: string): { day: number; month: number } | null {
    const parts = birthdate.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) return null;
    return { day, month };
}

/**
 * Devuelve la fecha (día/mes) desplazada `daysBefore` días hacia atrás
 * a partir de un (day, month). Maneja wraparound de mes/año usando
 * un año no bisiesto (2025) como referencia para evitar el 29-feb.
 */
function getDayShifted(day: number, month: number, daysBefore: number): { day: number; month: number } {
    if (daysBefore <= 0) return { day, month };
    const ref = new Date(2025, month - 1, day);
    ref.setDate(ref.getDate() - daysBefore);
    return { day: ref.getDate(), month: ref.getMonth() + 1 };
}

/** Próxima fecha de notificación (este año si no pasó, el siguiente si ya pasó). */
function getNextNotificationDate(day: number, month: number, hour: number, minute: number): Date {
    const now = new Date();
    const year = now.getFullYear();
    const candidate = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (candidate > now) return candidate;
    return new Date(year + 1, month - 1, day, hour, minute, 0, 0);
}

interface ContactForNotification {
    contact_id: string;
    first_name: string;
    surname: string;
    birthdate?: string | null;
}

/** Datos guardados en content.data para detectar cambios sin parsear el trigger. */
interface NotifData {
    notifyDay: number;
    notifyMonth: number;
    name: string;
    daysBefore: number;
    hour: number;
    minute: number;
    template?: string;
}

// ─── Sync inteligente ─────────────────────────────────────────────────────────

/**
 * Sincroniza las notificaciones de cumpleaños con el estado actual de contactos
 * y la configuración pasada. Solo cancela/crea las que realmente cambiaron.
 */
async function syncBirthdayNotifications(
    contacts: ContactForNotification[],
    settings: BirthdayNotificationSettings,
): Promise<number> {
    if (!N) return 0;

    // Si está deshabilitado, cancelar todo y salir
    if (!settings.enabled) {
        await cancelAllBirthdayNotifications();
        return 0;
    }

    const tn = (await getTranslations()).birthdayNotif;

    const scheduled = await N.getAllScheduledNotificationsAsync();
    const scheduledMap = new Map<string, NotifData | null>();
    for (const n of scheduled) {
        if (!n.identifier.startsWith('birthday_')) continue;
        const data = n.content.data as unknown as NotifData | null;
        scheduledMap.set(n.identifier, data ?? null);
    }

    const expectedIds = new Set<string>();
    let count = 0;

    for (const contact of contacts) {
        if (!contact.birthdate) continue;
        const parsed = parseBirthdate(contact.birthdate);
        if (!parsed) continue;

        const { day: notifyDay, month: notifyMonth } = getDayShifted(parsed.day, parsed.month, settings.daysBefore);
        const id = `birthday_${contact.contact_id}`;
        const expectedName = `${contact.first_name} ${contact.surname}`;
        const body = buildNotificationBody(settings.messageTemplate, expectedName, settings.daysBefore, tn);
        expectedIds.add(id);

        const existing = scheduledMap.get(id);

        if (existing !== undefined) {
            const upToDate =
                existing !== null &&
                existing.notifyDay === notifyDay &&
                existing.notifyMonth === notifyMonth &&
                existing.name === expectedName &&
                existing.daysBefore === settings.daysBefore &&
                existing.hour === settings.hour &&
                existing.minute === settings.minute &&
                (existing.template ?? undefined) === (settings.messageTemplate ?? undefined);

            if (upToDate) {
                count++;
                continue;
            }

            await N.cancelScheduledNotificationAsync(id);
        }

        try {
            await N.scheduleNotificationAsync({
                identifier: id,
                content: {
                    title: tn.title,
                    body,
                    sound: true,
                    data: {
                        notifyDay,
                        notifyMonth,
                        name: expectedName,
                        daysBefore: settings.daysBefore,
                        hour: settings.hour,
                        minute: settings.minute,
                        template: settings.messageTemplate,
                    } satisfies NotifData,
                },
                trigger: Platform.OS === 'ios'
                    ? {
                        type: N.SchedulableTriggerInputTypes.CALENDAR,
                        repeats: true,
                        month: notifyMonth,
                        day: notifyDay,
                        hour: settings.hour,
                        minute: settings.minute,
                    }
                    : {
                        type: N.SchedulableTriggerInputTypes.DATE,
                        date: getNextNotificationDate(notifyDay, notifyMonth, settings.hour, settings.minute),
                    },
            });
            count++;
        } catch (e) {
            console.error(`Error al programar notificación para ${contact.contact_id}:`, e);
        }
    }

    for (const [id] of scheduledMap) {
        if (!expectedIds.has(id)) {
            await N.cancelScheduledNotificationAsync(id);
        }
    }

    return count;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/** Llamado desde la pantalla de notificaciones al pulsar "Programar". */
export async function scheduleAllBirthdayNotifications(
    contacts: ContactForNotification[],
    settingsOverride?: BirthdayNotificationSettings,
): Promise<number> {
    const settings = settingsOverride ?? await loadNotificationSettings();

    if (isWeb) {
        if (!settings.enabled) return 0;
        const granted = await webRequestPermission();
        if (!granted) return 0;
        await checkAndShowBirthdayNotifications();
        return contacts.filter(c => c.birthdate).length;
    }
    if (!N) return 0;
    try {
        return await syncBirthdayNotifications(contacts, settings);
    } catch (_) {
        return 0;
    }
}

/** Llamado al arrancar la app (index.tsx) para reprogramar expiradas y limpiar obsoletas. */
export async function rescheduleExpiredBirthdayNotifications(
    contacts: ContactForNotification[],
    settingsOverride?: BirthdayNotificationSettings,
): Promise<void> {
    if (isWeb || !N) return;
    try {
        const settings = settingsOverride ?? await loadNotificationSettings();
        await syncBirthdayNotifications(contacts, settings);
    } catch (_) {}
}

export async function cancelBirthdayNotification(contactId: string): Promise<void> {
    if (isWeb || !N) return;
    try {
        await N.cancelScheduledNotificationAsync(`birthday_${contactId}`);
    } catch (_) {}
}

export async function cancelAllBirthdayNotifications(): Promise<number> {
    if (isWeb || !N) return 0;
    try {
        const scheduled = await N.getAllScheduledNotificationsAsync();
        let cancelled = 0;
        for (const n of scheduled) {
            if (n.identifier.startsWith('birthday_')) {
                await N.cancelScheduledNotificationAsync(n.identifier);
                cancelled++;
            }
        }
        return cancelled;
    } catch (_) {
        return 0;
    }
}

export async function getScheduledBirthdayCount(): Promise<number> {
    if (isWeb || !N) return 0;
    try {
        const scheduled = await N.getAllScheduledNotificationsAsync();
        return scheduled.filter(n => n.identifier.startsWith('birthday_')).length;
    } catch (_) {
        return 0;
    }
}

// Verificar cumpleaños al arrancar la app (Electron)
export async function checkBirthdaysOnStartup(): Promise<void> {
    if (!isWeb) return;
    const granted = await webRequestPermission();
    if (!granted) return;
    await checkAndShowBirthdayNotifications();
}
