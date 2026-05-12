import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { db } from './db';
import { toDisplay } from './contactUtils';
import { createContactsActions } from './contactsActions';
import type { Contact, ContactsContextType } from './contactsTypes';

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

    const normalizeContact = useCallback((contact: Contact): Contact => ({
        ...contact,
        first_name: toDisplay(contact.first_name),
        middle_name: contact.middle_name ? toDisplay(contact.middle_name) : contact.middle_name,
        surname: toDisplay(contact.surname),
    }), []);

    const fetchContacts = useCallback(async (): Promise<Contact[]> => {
        try {
            const result = await db.getAllAsync<Contact>('SELECT * FROM contact ORDER BY first_name ASC;');
            const normalized = result.map(normalizeContact);
            setContacts(normalized);
            return normalized;
        } catch (e) {
            console.error(e);
            return [];
        }
    }, [normalizeContact]);

    const actions = useMemo(
        () => createContactsActions({ fetchContacts, normalizeContact }),
        [fetchContacts, normalizeContact]
    );

    const value = useMemo<ContactsContextType>(() => ({
        contacts,
        ...actions,
    }), [contacts, actions]);

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
