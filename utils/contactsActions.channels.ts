import { db } from './db';
import { toDisplay, toUpper } from './contactUtils';
import type {
    ContactEmail,
    ContactKeyword,
    ContactNote,
    ContactPhone,
    ContactsContextType,
    ContactUrl,
} from './contactsTypes';

export function createContactsChannelActions(): Pick<
    ContactsContextType,
    | 'getContactPhones'
    | 'addContactPhone'
    | 'updateContactPhone'
    | 'removeContactPhone'
    | 'getContactEmails'
    | 'addContactEmail'
    | 'updateContactEmail'
    | 'removeContactEmail'
    | 'getContactKeywords'
    | 'addContactKeyword'
    | 'removeContactKeyword'
    | 'getContactNotes'
    | 'addContactNote'
    | 'removeContactNote'
    | 'getContactUrls'
    | 'addContactUrl'
    | 'removeContactUrl'
> {
    const getContactPhones = async (contactId: string): Promise<ContactPhone[]> => {
        try {
            const result = await db.getAllAsync<ContactPhone>(
                'SELECT * FROM contact_phone WHERE contact_id = ? ORDER BY id ASC', contactId
            );
            return result.map(r => ({ ...r, label: r.label ? toDisplay(r.label) : r.label }));
        } catch (e) { console.error(e); return []; }
    };

    const addContactPhone = async (contactId: string, phone: string, label?: string): Promise<boolean> => {
        try {
            await db.runAsync('INSERT INTO contact_phone (contact_id, phone, label) VALUES (?, ?, ?)', contactId, phone, toUpper(label));
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const updateContactPhone = async (id: number, phone: string, label?: string): Promise<boolean> => {
        try {
            await db.runAsync("UPDATE contact_phone SET phone = ?, label = ?, updated_at = datetime('now') WHERE id = ?", phone, toUpper(label), id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactPhone = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_phone WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const getContactEmails = async (contactId: string): Promise<ContactEmail[]> => {
        try {
            const result = await db.getAllAsync<ContactEmail>(
                'SELECT * FROM contact_email WHERE contact_id = ? ORDER BY id ASC', contactId
            );
            return result.map(r => ({ ...r, label: r.label ? toDisplay(r.label) : r.label }));
        } catch (e) { console.error(e); return []; }
    };

    const addContactEmail = async (contactId: string, email: string, label?: string): Promise<boolean> => {
        try {
            await db.runAsync('INSERT INTO contact_email (contact_id, email, label) VALUES (?, ?, ?)', contactId, email, toUpper(label));
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const updateContactEmail = async (id: number, email: string, label?: string): Promise<boolean> => {
        try {
            await db.runAsync("UPDATE contact_email SET email = ?, label = ?, updated_at = datetime('now') WHERE id = ?", email, toUpper(label), id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactEmail = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_email WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const getContactKeywords = async (contactId: string): Promise<ContactKeyword[]> => {
        try {
            const result = await db.getAllAsync<ContactKeyword>(
                'SELECT * FROM contact_keyword WHERE contact_id = ? ORDER BY keyword ASC', contactId
            );
            return result.map(r => ({ ...r, keyword: toDisplay(r.keyword) }));
        } catch (e) { console.error(e); return []; }
    };

    const addContactKeyword = async (contactId: string, keyword: string): Promise<boolean> => {
        try {
            await db.runAsync('INSERT OR IGNORE INTO contact_keyword (contact_id, keyword) VALUES (?, ?)', contactId, toUpper(keyword));
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactKeyword = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_keyword WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const getContactNotes = async (contactId: string): Promise<ContactNote[]> => {
        try {
            const result = await db.getAllAsync<ContactNote>(
                'SELECT * FROM contact_note WHERE contact_id = ? ORDER BY id ASC', contactId
            );
            return result.map(r => ({ ...r, note: toDisplay(r.note) }));
        } catch (e) { console.error(e); return []; }
    };

    const addContactNote = async (contactId: string, note: string): Promise<boolean> => {
        try {
            await db.runAsync('INSERT INTO contact_note (contact_id, note) VALUES (?, ?)', contactId, toUpper(note));
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactNote = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_note WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const getContactUrls = async (contactId: string): Promise<ContactUrl[]> => {
        try {
            const result = await db.getAllAsync<ContactUrl>(
                'SELECT * FROM contact_url WHERE contact_id = ? ORDER BY id ASC', contactId
            );
            return result.map(r => ({ ...r, label: r.label ? toDisplay(r.label) : r.label }));
        } catch (e) { console.error(e); return []; }
    };

    const addContactUrl = async (contactId: string, url: string, label?: string): Promise<boolean> => {
        try {
            await db.runAsync('INSERT INTO contact_url (contact_id, url, label) VALUES (?, ?, ?)', contactId, url, toUpper(label));
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactUrl = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_url WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    return {
        getContactPhones,
        addContactPhone,
        updateContactPhone,
        removeContactPhone,
        getContactEmails,
        addContactEmail,
        updateContactEmail,
        removeContactEmail,
        getContactKeywords,
        addContactKeyword,
        removeContactKeyword,
        getContactNotes,
        addContactNote,
        removeContactNote,
        getContactUrls,
        addContactUrl,
        removeContactUrl,
    };
}
