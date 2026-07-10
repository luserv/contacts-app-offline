import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { db, getDatabaseSignature, writeDatabaseFromBase64 } from './db';
import { toDisplay } from './contactUtils';
import { createContactsActions } from './contactsActions';
import type { Contact, ContactsContextType } from './contactsTypes';
import { useAuth } from './authContext';
import { checkBackupExists, downloadDB } from './driveSync';
import {
  getLastSyncAt, isAutoSyncEnabled, pullIfNeeded, pushNow,
  schedulePush, setAutoSyncEnabled, syncNow as syncNowRemote,
} from './sync';

export const DB_NAME = 'contacts.db';

// No-op: la inicialización ocurre en db.native.ts (Android/iOS) y electron/main.js (desktop)
export async function initializeDatabase() {}

export type {
    Contact,
    ContactBankAccount,
    ContactEmail,
    ContactInput,
    ContactKeyword,
    ContactNote,
    ContactOrganization,
    ContactPhone,
    ContactsContextType,
    ContactUrl,
    IdentityCard,
    MaritalStatus,
    Relationship,
    RelationshipType,
} from './contactsTypes';

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export function ContactsProvider({ children }: { children: ReactNode }) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(true);

    const normalizeContact = useCallback((contact: Contact): Contact => ({
        ...contact,
        first_name: toDisplay(contact.first_name),
        middle_name: contact.middle_name ? toDisplay(contact.middle_name) : contact.middle_name,
        surname: toDisplay(contact.surname),
    }), []);

    const fetchContacts = useCallback(async (): Promise<Contact[]> => {
        try {
            const result = await db.getAllAsync<Contact>('SELECT *, rowid FROM contact ORDER BY first_name ASC;');
            const normalized = result.map(normalizeContact);
            setContacts(normalized);
            return normalized;
        } catch (e) {
            console.error(e);
            return [];
        } finally {
            setContactsLoading(false);
        }
    }, [normalizeContact]);

    const actions = useMemo(
        () => createContactsActions({ fetchContacts, normalizeContact }),
        [fetchContacts, normalizeContact]
    );

    // ── Sincronización entre dispositivos ─────────────────────────────────────────
    const { driveToken, refreshDriveToken } = useAuth();
    const tokenRef = useRef<string | null>(driveToken);
    tokenRef.current = driveToken;
    const [syncing, setSyncing] = useState(false);
    const [syncEnabled, setSyncEnabledState] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            setSyncEnabledState(await isAutoSyncEnabled());
            setLastSyncAt(await getLastSyncAt());
        })();
    }, []);

    // Interceptar escrituras: cada runAsync programa un push diferido.
    useEffect(() => {
        const orig = db.runAsync;
        db.runAsync = (sql: string, ...params: unknown[]) => {
            const p = orig(sql, ...params);
            p.then(() => schedulePush(() => tokenRef.current)).catch(() => {});
            return p;
        };
        return () => { db.runAsync = orig; };
    }, []);

    const runWithToken = useCallback(async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
        const token = tokenRef.current;
        if (!token) throw new Error('SIGN_IN_REQUIRED');
        try {
            return await fn(token);
        } catch (e: any) {
            if (e?.message === 'TOKEN_EXPIRED') {
                const fresh = await refreshDriveToken();
                if (!fresh) throw new Error('TOKEN_EXPIRED');
                return await fn(fresh);
            }
            throw e;
        }
    }, [refreshDriveToken]);

    const setSyncEnabled = useCallback(async (enabled: boolean) => {
        await setAutoSyncEnabled(enabled);
        setSyncEnabledState(enabled);
        if (enabled && tokenRef.current) {
            try {
                await runWithToken(t => pushNow(t));
                setLastSyncAt(await getLastSyncAt());
            } catch (e) {
                console.warn('[sync] push inicial falló:', e);
            }
        }
    }, [runWithToken]);

    const syncNow = useCallback(async (): Promise<{ changed: boolean; error?: string }> => {
        if (!tokenRef.current) return { changed: false, error: 'SIGN_IN_REQUIRED' };
        setSyncing(true);
        try {
            const res = await runWithToken(t => syncNowRemote(t));
            if (res.changed) await fetchContacts();
            setLastSyncAt(await getLastSyncAt());
            return { changed: res.changed };
        } catch (e: any) {
            return { changed: false, error: e?.message ?? 'SYNC_ERROR' };
        } finally {
            setSyncing(false);
        }
    }, [runWithToken, fetchContacts]);

    // Pull al volver la app a primer plano.
    useEffect(() => {
        const sub = AppState.addEventListener('change', async (state) => {
            if (state !== 'active' || !tokenRef.current) return;
            if (!(await isAutoSyncEnabled())) return;
            setSyncing(true);
            try {
                const res = await runWithToken(t => pullIfNeeded(t));
                if (res.changed) await fetchContacts();
                setLastSyncAt(await getLastSyncAt());
            } catch (e) {
                console.warn('[sync] pull en foreground falló:', e);
            } finally {
                setSyncing(false);
            }
        });
        return () => sub.remove();
    }, [runWithToken, fetchContacts]);

    // Auto-restore: si la DB local está vacía al iniciar sesión, descarga el backup de Drive.
    const hasCheckedRestore = useRef(false);
    useEffect(() => {  // eslint-disable-line react-hooks/exhaustive-deps
        if (!driveToken || hasCheckedRestore.current) return;
        hasCheckedRestore.current = true;
        (async () => {
            try {
                const sig = await getDatabaseSignature();
                if (Number(sig) > 0) return;
                const exists = await checkBackupExists(driveToken);
                if (!exists) return;
                const base64 = await downloadDB(driveToken);
                await writeDatabaseFromBase64(base64);
                await fetchContacts();
            } catch (e) {
                console.warn('[auto-restore]', e);
            }
        })();
    }, [driveToken, fetchContacts]);

    // Pull inicial cuando el token está disponible.
    useEffect(() => {
        if (!driveToken) return;
        (async () => {
            if (!(await isAutoSyncEnabled())) return;
            setSyncing(true);
            try {
                const res = await runWithToken(t => pullIfNeeded(t));
                if (res.changed) await fetchContacts();
                setLastSyncAt(await getLastSyncAt());
            } catch (e) {
                console.warn('[sync] pull inicial falló:', e);
            } finally {
                setSyncing(false);
            }
        })();
    }, [driveToken, runWithToken, fetchContacts]);

    const value = useMemo<ContactsContextType>(() => ({
        contacts,
        contactsLoading,
        ...actions,
        syncing,
        syncEnabled,
        lastSyncAt,
        setSyncEnabled,
        syncNow,
    }), [contacts, contactsLoading, actions, syncing, syncEnabled, lastSyncAt, setSyncEnabled, syncNow]);

    return (
        <ContactsContext.Provider value={value}>
            {children}
        </ContactsContext.Provider>
    );
}

export function useContacts() {
    const context = useContext(ContactsContext);
    if (!context) {
        throw new Error('useContacts must be used within a ContactsProvider');
    }
    return context;
}
