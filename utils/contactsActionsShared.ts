import type { Contact } from './contactsTypes';

export interface CreateContactsActionsParams {
    fetchContacts: () => Promise<Contact[]>;
    normalizeContact: (contact: Contact) => Contact;
}
