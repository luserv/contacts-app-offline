import { Platform } from 'react-native';

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
    for (const c of contacts) {
        showWebNotification(
            '🎂 Cumpleaños mañana',
            `${c.first_name} ${c.surname} cumple años mañana.`
        );
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
                name: 'Cumpleaños',
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

function getDayBefore(day: number, month: number): { day: number; month: number } {
    if (day > 1) return { day: day - 1, month };
    const prevMonth = month === 1 ? 12 : month - 1;
    const lastDay = new Date(2024, prevMonth, 0).getDate();
    return { day: lastDay, month: prevMonth };
}

/** Próxima fecha de notificación (este año si no pasó, el siguiente si ya pasó). */
function getNextNotificationDate(day: number, month: number, hour = 9): Date {
    const now = new Date();
    const year = now.getFullYear();
    const candidate = new Date(year, month - 1, day, hour, 0, 0, 0);
    if (candidate > now) return candidate;
    return new Date(year + 1, month - 1, day, hour, 0, 0, 0);
}

interface ContactForNotification {
    contact_id: string;
    first_name: string;
    surname: string;
    birthdate?: string | null;
}

/** Datos que se guardan en content.data para comparar sin parsear el trigger. */
interface NotifData {
    notifyDay: number;
    notifyMonth: number;
    name: string;
}

// ─── Sync inteligente ─────────────────────────────────────────────────────────

/**
 * Sincroniza las notificaciones de cumpleaños con el estado actual de contactos.
 * Solo cancela/crea las que realmente cambiaron:
 *   - Nuevo contacto con fecha → crea
 *   - Fecha de cumpleaños cambió → cancela + crea
 *   - Nombre cambió → cancela + crea
 *   - Contacto eliminado o sin fecha → cancela
 *   - Sin cambios → no toca nada
 */
async function syncBirthdayNotifications(contacts: ContactForNotification[]): Promise<number> {
    if (!N) return 0;

    // Mapa de notificaciones actualmente programadas: id → data almacenada
    const scheduled = await N.getAllScheduledNotificationsAsync();
    const scheduledMap = new Map<string, NotifData | null>();
    for (const n of scheduled) {
        if (!n.identifier.startsWith('birthday_')) continue;
        const data = n.content.data as NotifData | null;
        scheduledMap.set(n.identifier, data ?? null);
    }

    // IDs que deberían existir al final
    const expectedIds = new Set<string>();
    let count = 0;

    for (const contact of contacts) {
        if (!contact.birthdate) continue;
        const parsed = parseBirthdate(contact.birthdate);
        if (!parsed) continue;

        const { day: notifyDay, month: notifyMonth } = getDayBefore(parsed.day, parsed.month);
        const id = `birthday_${contact.contact_id}`;
        const expectedName = `${contact.first_name} ${contact.surname}`;
        expectedIds.add(id);

        const existing = scheduledMap.get(id);

        if (existing !== undefined) {
            // Ya existe — verificar si el contenido coincide
            const upToDate =
                existing !== null &&
                existing.notifyDay === notifyDay &&
                existing.notifyMonth === notifyMonth &&
                existing.name === expectedName;

            if (upToDate) {
                count++;
                continue; // Sin cambios, no tocar
            }

            // Cambió fecha o nombre → cancelar para reprogramar
            await N.cancelScheduledNotificationAsync(id);
        }

        // Programar (nueva o actualizada)
        try {
            await N.scheduleNotificationAsync({
                identifier: id,
                content: {
                    title: '🎂 Cumpleaños mañana',
                    body: `${expectedName} cumple años mañana.`,
                    sound: true,
                    data: { notifyDay, notifyMonth, name: expectedName } satisfies NotifData,
                },
                trigger: Platform.OS === 'ios'
                    ? {
                        type: N.SchedulableTriggerInputTypes.CALENDAR,
                        repeats: true,
                        month: notifyMonth,
                        day: notifyDay,
                        hour: 9,
                        minute: 0,
                    }
                    : {
                        type: N.SchedulableTriggerInputTypes.DATE,
                        date: getNextNotificationDate(notifyDay, notifyMonth),
                    },
            });
            count++;
        } catch (e) {
            console.error(`Error al programar notificación para ${contact.contact_id}:`, e);
        }
    }

    // Cancelar notificaciones de contactos que ya no tienen fecha o fueron eliminados
    for (const [id] of scheduledMap) {
        if (!expectedIds.has(id)) {
            await N.cancelScheduledNotificationAsync(id);
        }
    }

    return count;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/** Llamado desde config.tsx al pulsar "Programar notificaciones". */
export async function scheduleAllBirthdayNotifications(contacts: ContactForNotification[]): Promise<number> {
    if (isWeb) {
        const granted = await webRequestPermission();
        if (!granted) return 0;
        await checkAndShowBirthdayNotifications();
        return contacts.filter(c => c.birthdate).length;
    }
    if (!N) return 0;
    try {
        return await syncBirthdayNotifications(contacts);
    } catch (_) {
        return 0;
    }
}

/** Llamado al arrancar la app (index.tsx) para reprogramar expiradas y limpiar obsoletas. */
export async function rescheduleExpiredBirthdayNotifications(contacts: ContactForNotification[]): Promise<void> {
    if (isWeb || !N) return;
    try {
        await syncBirthdayNotifications(contacts);
    } catch (_) {}
}

export async function cancelBirthdayNotification(contactId: string): Promise<void> {
    if (isWeb || !N) return;
    try {
        await N.cancelScheduledNotificationAsync(`birthday_${contactId}`);
    } catch (_) {}
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
