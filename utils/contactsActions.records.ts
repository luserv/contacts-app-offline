import { db } from './db';
import { toDisplay, toUpper } from './contactUtils';
import { toTitleDisplay } from './textFormat';
import type { CreateContactsActionsParams } from './contactsActionsShared';
import type {
    Contact,
    ContactBankAccount,
    ContactOrganization,
    ContactsContextType,
    IdentityCard,
    MaritalStatus,
} from './contactsTypes';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function createContactsRecordActions({
    fetchContacts,
}: CreateContactsActionsParams): Pick<
    ContactsContextType,
    | 'getMaritalStatuses'
    | 'getIdentityCards'
    | 'addIdentityCard'
    | 'updateIdentityCard'
    | 'deleteIdentityCard'
    | 'getContactOrganizations'
    | 'addContactOrganization'
    | 'updateContactOrganization'
    | 'removeContactOrganization'
    | 'searchOrganizations'
    | 'getBankAccounts'
    | 'addBankAccount'
    | 'updateBankAccount'
    | 'deleteBankAccount'
    | 'searchAchievements'
    | 'searchBanks'
    | 'searchAccountTypes'
    | 'importVcf'
> {
    const getMaritalStatuses = async (): Promise<MaritalStatus[]> => {
        try {
            return await db.getAllAsync<MaritalStatus>('SELECT * FROM marital_status ORDER BY marital_status ASC;');
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const getIdentityCards = async (contactId: string): Promise<IdentityCard[]> => {
        try {
            const result = await db.getAllAsync<IdentityCard>(
                'SELECT * FROM national_identity_card WHERE contact_id = ? ORDER BY id ASC', contactId
            );
            return result.map(r => ({ ...r, card_number: toDisplay(r.card_number) }));
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const addIdentityCard = async (
        contactId: string, docType: string, cardNumber: string, issueDate?: string, expiryDate?: string
    ): Promise<boolean> => {
        try {
            if (docType === 'Cédula') {
                const existing = await db.getFirstAsync<{ id: number }>(
                    "SELECT id FROM national_identity_card WHERE contact_id = ? AND doc_type = 'Cédula'", contactId
                );
                if (existing) return false;
            }
            await db.runAsync(
                'INSERT INTO national_identity_card (contact_id, doc_type, card_number, issue_date, expiry_date) VALUES (?, ?, ?, ?, ?)',
                contactId, docType, toUpper(cardNumber), issueDate ?? null, expiryDate ?? null
            );
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const updateIdentityCard = async (
        id: number, docType: string, cardNumber: string, issueDate?: string, expiryDate?: string
    ): Promise<boolean> => {
        try {
            await db.runAsync(
                'UPDATE national_identity_card SET doc_type = ?, card_number = ?, issue_date = ?, expiry_date = ? WHERE id = ?',
                docType, toUpper(cardNumber), issueDate ?? null, expiryDate ?? null, id
            );
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const deleteIdentityCard = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM national_identity_card WHERE id = ?', id);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const getContactOrganizations = async (contactId: string): Promise<ContactOrganization[]> => {
        try {
            const result = await db.getAllAsync<ContactOrganization>(`
                SELECT co.id, co.contact_id, co.organization_id, o.name AS organization_name,
                       co.achievement, co.date
                FROM contact_organization co
                JOIN organization o ON co.organization_id = o.organization_id
                WHERE co.contact_id = ?
                ORDER BY co.date DESC, o.name ASC
            `, contactId);
            return result.map(r => ({
                ...r,
                organization_name: toTitleDisplay(r.organization_name),
                achievement: toDisplay(r.achievement),
            }));
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const addContactOrganization = async (
        contactId: string, orgName: string, achievement: string, date?: string
    ): Promise<boolean> => {
        try {
            const upperOrgName = toUpper(orgName) ?? '';
            const orgId = 'org_' + upperOrgName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            await db.runAsync('INSERT OR IGNORE INTO organization (organization_id, name) VALUES (?, ?)', orgId, upperOrgName);
            const org = await db.getFirstAsync<{ organization_id: string }>(
                'SELECT organization_id FROM organization WHERE name = ?', upperOrgName
            );
            if (!org) return false;
            await db.runAsync(
                'INSERT INTO contact_organization (contact_id, organization_id, achievement, date) VALUES (?, ?, ?, ?)',
                contactId, org.organization_id, toUpper(achievement), date ?? null
            );
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const updateContactOrganization = async (
        id: number, orgName: string, achievement: string, date?: string
    ): Promise<boolean> => {
        try {
            const upperOrgName = toUpper(orgName) ?? '';
            const orgId = 'org_' + upperOrgName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            await db.runAsync('INSERT OR IGNORE INTO organization (organization_id, name) VALUES (?, ?)', orgId, upperOrgName);
            const org = await db.getFirstAsync<{ organization_id: string }>(
                'SELECT organization_id FROM organization WHERE name = ?', upperOrgName
            );
            if (!org) return false;
            await db.runAsync(
                'UPDATE contact_organization SET organization_id = ?, achievement = ?, date = ? WHERE id = ?',
                org.organization_id, toUpper(achievement), date ?? null, id
            );
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactOrganization = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_organization WHERE id = ?', id);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const searchOrganizations = async (query: string): Promise<{ organization_id: string; name: string }[]> => {
        try {
            const result = await db.getAllAsync<{ organization_id: string; name: string }>(
                'SELECT organization_id, name FROM organization WHERE name LIKE ? ORDER BY name ASC LIMIT 10',
                `%${query.toUpperCase()}%`
            );
            return result.map(r => ({ ...r, name: toTitleDisplay(r.name) }));
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const getBankAccounts = async (contactId: string): Promise<ContactBankAccount[]> => {
        try {
            const result = await db.getAllAsync<ContactBankAccount>(
                'SELECT * FROM contact_bank_account WHERE contact_id = ? ORDER BY id ASC', contactId
            );
            return result.map(r => ({
                ...r,
                bank_name: r.bank_name ? toTitleDisplay(r.bank_name) : r.bank_name,
                account_type: r.account_type ? toDisplay(r.account_type) : r.account_type,
                label: r.label ? toDisplay(r.label) : r.label,
            }));
        } catch (e) { console.error(e); return []; }
    };

    const addBankAccount = async (
        contactId: string, accountNumber: string, bankName?: string, accountType?: string, label?: string
    ): Promise<boolean> => {
        try {
            await db.runAsync(
                'INSERT INTO contact_bank_account (contact_id, account_number, bank_name, account_type, label) VALUES (?, ?, ?, ?, ?)',
                contactId, accountNumber, toUpper(bankName), toUpper(accountType), toUpper(label)
            );
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const updateBankAccount = async (
        id: number, accountNumber: string, bankName?: string, accountType?: string, label?: string
    ): Promise<boolean> => {
        try {
            await db.runAsync(
                'UPDATE contact_bank_account SET account_number = ?, bank_name = ?, account_type = ?, label = ? WHERE id = ?',
                accountNumber, toUpper(bankName), toUpper(accountType), toUpper(label), id
            );
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const deleteBankAccount = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_bank_account WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const searchAchievements = async (query: string): Promise<string[]> => {
        try {
            const results = await db.getAllAsync<{ achievement: string }>(
                `SELECT DISTINCT achievement FROM contact_organization
                 WHERE achievement LIKE ? ORDER BY achievement ASC LIMIT 10`,
                `%${query.toUpperCase()}%`
            );
            return results.map(r => toDisplay(r.achievement)).filter(Boolean) as string[];
        } catch (e) { console.error(e); return []; }
    };

    const searchBanks = async (query: string): Promise<string[]> => {
        try {
            const results = await db.getAllAsync<{ bank_name: string }>(
                `SELECT DISTINCT bank_name FROM contact_bank_account
                 WHERE bank_name LIKE ? ORDER BY bank_name ASC LIMIT 10`,
                `%${query.toUpperCase()}%`
            );
            return results.map(r => toTitleDisplay(r.bank_name)).filter(Boolean) as string[];
        } catch (e) { console.error(e); return []; }
    };

    const searchAccountTypes = async (query: string): Promise<string[]> => {
        try {
            const results = await db.getAllAsync<{ account_type: string }>(
                `SELECT DISTINCT account_type FROM contact_bank_account
                 WHERE account_type LIKE ? ORDER BY account_type ASC LIMIT 10`,
                `%${query.toUpperCase()}%`
            );
            return results.map(r => toDisplay(r.account_type)).filter(Boolean) as string[];
        } catch (e) { console.error(e); return []; }
    };

    const importVcf = async (content: string): Promise<{ imported: number; skipped: number }> => {
        const { parseVcf } = await import('./vcfImport');
        const cards = parseVcf(content);
        let imported = 0;
        let skipped = 0;

        for (const card of cards) {
            try {
                const id = generateId();
                await db.runAsync(
                    'INSERT INTO contact (contact_id, first_name, middle_name, surname, birthdate) VALUES (?, ?, ?, ?, ?)',
                    id, toUpper(card.first_name), toUpper(card.middle_name), toUpper(card.surname), card.birthdate ?? null
                );

                for (const p of card.phones) {
                    await db.runAsync('INSERT INTO contact_phone (contact_id, phone, label) VALUES (?, ?, ?)', id, p.phone, toUpper(p.label));
                }
                for (const e of card.emails) {
                    await db.runAsync('INSERT INTO contact_email (contact_id, email, label) VALUES (?, ?, ?)', id, e.email, toUpper(e.label));
                }
                for (const n of card.notes) {
                    await db.runAsync('INSERT INTO contact_note (contact_id, note) VALUES (?, ?)', id, toUpper(n));
                }
                for (const u of card.urls) {
                    await db.runAsync('INSERT INTO contact_url (contact_id, url, label) VALUES (?, ?, ?)', id, u.url, toUpper(u.label));
                }
                if (card.identity_card) {
                    await db.runAsync(
                        'INSERT INTO national_identity_card (contact_id, doc_type, card_number) VALUES (?, ?, ?)',
                        id, 'Cédula', toUpper(card.identity_card.card_number)
                    );
                }
                if (card.org) {
                    const upperOrgName = toUpper(card.org.name) ?? '';
                    const orgId = 'org_' + Date.now() + Math.random().toString(36).slice(2, 6);
                    await db.runAsync('INSERT OR IGNORE INTO organization (organization_id, name) VALUES (?, ?)', orgId, upperOrgName);
                    const org = await db.getFirstAsync<{ organization_id: string }>(
                        'SELECT organization_id FROM organization WHERE name = ?', upperOrgName
                    );
                    if (org) {
                        await db.runAsync(
                            'INSERT INTO contact_organization (contact_id, organization_id, achievement, date) VALUES (?, ?, ?, ?)',
                            id, org.organization_id, toUpper(card.org.achievement), card.org.date ?? null
                        );
                    }
                }
                imported++;
            } catch (e) {
                console.error('Error importando contacto:', e);
                skipped++;
            }
        }

        await fetchContacts();
        return { imported, skipped };
    };

    return {
        getMaritalStatuses,
        getIdentityCards,
        addIdentityCard,
        updateIdentityCard,
        deleteIdentityCard,
        getContactOrganizations,
        addContactOrganization,
        updateContactOrganization,
        removeContactOrganization,
        searchOrganizations,
        getBankAccounts,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        searchAchievements,
        searchBanks,
        searchAccountTypes,
        importVcf,
    };
}
