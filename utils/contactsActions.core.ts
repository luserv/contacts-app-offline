import { db } from './db';
import { toUpper } from './contactUtils';
import type { CreateContactsActionsParams } from './contactsActionsShared';
import type { Contact, ContactInput, ContactsContextType } from './contactsTypes';

export function createContactsCoreActions({
    fetchContacts,
    normalizeContact,
}: CreateContactsActionsParams): Pick<
    ContactsContextType,
    'createContact' | 'getContact' | 'deleteContact' | 'updateContact' | 'searchContacts' | 'fetchContacts'
> {
    const createContact = async (data: ContactInput) => {
        try {
            const id = 'c' + Date.now();
            await db.runAsync(
                'INSERT INTO contact (contact_id, first_name, middle_name, surname, birthdate, gender, status_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                id, toUpper(data.first_name), toUpper(data.middle_name), toUpper(data.surname), data.birthdate ?? null, data.gender ?? null, data.status_id ?? null
            );
            return { contact_id: id, ...data };
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const getContact = async (id: string) => {
        try {
            const contact = await db.getFirstAsync<Contact>('SELECT * FROM contact WHERE contact_id = ?;', id);
            return contact ? normalizeContact(contact) : null;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const deleteContact = async (id: string): Promise<boolean> => {
        try {
            await db.execAsync('BEGIN');
            await db.runAsync('DELETE FROM contact_relationship WHERE contact_id = ? OR related_contact_id = ?', id, id);
            await db.runAsync('DELETE FROM contact_phone WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM contact_email WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM contact_keyword WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM contact_note WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM contact_url WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM national_identity_card WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM contact_organization WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM contact_bank_account WHERE contact_id = ?', id);
            await db.runAsync('DELETE FROM contact WHERE contact_id = ?', id);
            await db.execAsync('COMMIT');
            return true;
        } catch (e) {
            try { await db.execAsync('ROLLBACK'); } catch (_) {}
            console.error(e);
            return false;
        }
    };

    const updateContact = async (id: string, data: ContactInput): Promise<boolean> => {
        try {
            await db.runAsync(
                'UPDATE contact SET first_name = ?, middle_name = ?, surname = ?, birthdate = ?, gender = ?, status_id = ? WHERE contact_id = ?',
                toUpper(data.first_name), toUpper(data.middle_name), toUpper(data.surname), data.birthdate ?? null, data.gender ?? null, data.status_id ?? null, id
            );
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const searchContacts = async (query: string): Promise<Contact[]> => {
        try {
            const tokens = query.trim().split(/\s+/).filter(Boolean);
            if (tokens.length === 0) return [];

            const tokenConditions = tokens.map(() =>
                `(c.first_name LIKE ? OR c.middle_name LIKE ? OR c.surname LIKE ?
                  OR ck.keyword LIKE ? OR o.name LIKE ? OR co.achievement LIKE ? OR co.date LIKE ?)`
            ).join(' AND ');
            const params = tokens.flatMap(token => {
                const q = `%${token.toUpperCase()}%`;
                return [q, q, q, q, q, q, q];
            });

            const matchCondition = tokens.map(() =>
                `(o2.name LIKE ? OR co2.achievement LIKE ? OR co2.date LIKE ?)`
            ).join(' AND ');
            const matchParams = tokens.flatMap(token => {
                const q = `%${token.toUpperCase()}%`;
                return [q, q, q];
            });

            const results = await db.getAllAsync<Contact>(
                `SELECT c.*,
                    (SELECT co2.achievement FROM contact_organization co2
                     JOIN organization o2 ON co2.organization_id = o2.organization_id
                     WHERE co2.contact_id = c.contact_id AND (${matchCondition})
                     ORDER BY co2.date DESC LIMIT 1) AS achievement,
                    (SELECT o2.name FROM contact_organization co2
                     JOIN organization o2 ON co2.organization_id = o2.organization_id
                     WHERE co2.contact_id = c.contact_id AND (${matchCondition})
                     ORDER BY co2.date DESC LIMIT 1) AS organization_name,
                    (SELECT co2.date FROM contact_organization co2
                     JOIN organization o2 ON co2.organization_id = o2.organization_id
                     WHERE co2.contact_id = c.contact_id AND (${matchCondition})
                     ORDER BY co2.date DESC LIMIT 1) AS organization_date
                 FROM contact c
                 LEFT JOIN contact_keyword ck ON c.contact_id = ck.contact_id
                 LEFT JOIN contact_organization co ON c.contact_id = co.contact_id
                 LEFT JOIN organization o ON co.organization_id = o.organization_id
                 WHERE ${tokenConditions}
                 GROUP BY c.contact_id
                 ORDER BY c.first_name ASC`,
                ...matchParams, ...matchParams, ...matchParams, ...params
            );
            return results.map(normalizeContact);
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    return {
        fetchContacts,
        createContact,
        getContact,
        deleteContact,
        updateContact,
        searchContacts,
    };
}
