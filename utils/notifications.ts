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

// ─── API pública ─────────────────────────────────────────────────────────────

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

interface ContactForNotification {
    contact_id: string;
    first_name: string;
    surname: string;
    birthdate?: string | null;
}

export async function scheduleAllBirthdayNotifications(contacts: ContactForNotification[]): Promise<number> {
    if (isWeb) {
        // En Electron: pedir permiso y mostrar las de mañana de inmediato.
        // Las futuras se verifican en cada inicio de la app.
        const granted = await webRequestPermission();
        if (!granted) return 0;
        await checkAndShowBirthdayNotifications();
        // Contar cuántos tienen cumpleaños registrado
        return contacts.filter(c => c.birthdate).length;
    }

    if (!N) return 0;
    try {
        const scheduled = await N.getAllScheduledNotificationsAsync();
        const birthdayIds = scheduled
            .filter(n => n.identifier.startsWith('birthday_'))
            .map(n => n.identifier);
        await Promise.all(birthdayIds.map(id => N!.cancelScheduledNotificationAsync(id)));

        let count = 0;
        for (const contact of contacts) {
            if (!contact.birthdate) continue;
            const parsed = parseBirthdate(contact.birthdate);
            if (!parsed) continue;
            const { day: notifyDay, month: notifyMonth } = getDayBefore(parsed.day, parsed.month);
            try {
                await N.scheduleNotificationAsync({
                    identifier: `birthday_${contact.contact_id}`,
                    content: {
                        title: '🎂 Cumpleaños mañana',
                        body: `${contact.first_name} ${contact.surname} cumple años mañana.`,
                        sound: true,
                    },
                    trigger: {
                        type: N.SchedulableTriggerInputTypes.CALENDAR,
                        repeats: true,
                        month: notifyMonth,
                        day: notifyDay,
                        hour: 9,
                        minute: 0,
                    },
                });
                count++;
            } catch (e) {
                console.error(`Error al programar notificación para ${contact.contact_id}:`, e);
            }
        }
        return count;
    } catch (_) {
        return 0;
    }
}

export async function cancelBirthdayNotification(contactId: string): Promise<void> {
    if (isWeb || !N) return;
    try {
        await N.cancelScheduledNotificationAsync(`birthday_${contactId}`);
    } catch (_) {}
}

export async function getScheduledBirthdayCount(): Promise<number> {
    if (isWeb) return 0;
    if (!N) return 0;
    try {
        const scheduled = await N.getAllScheduledNotificationsAsync();
        return scheduled.filter(n => n.identifier.startsWith('birthday_')).length;
    } catch (_) {
        return 0;
    }
}

// En Electron: verificar cumpleaños al arrancar la app (llamar desde _layout.tsx)
export async function checkBirthdaysOnStartup(): Promise<void> {
    if (!isWeb) return;
    const granted = await webRequestPermission();
    if (!granted) return;
    await checkAndShowBirthdayNotifications();
}
