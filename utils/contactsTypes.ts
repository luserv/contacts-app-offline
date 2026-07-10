export interface Contact {
    contact_id: string;
    first_name: string;
    middle_name?: string;
    surname: string;
    status_id?: string;
    [key: string]: any;
}

export interface ContactPhone {
    id: number;
    contact_id: string;
    phone: string;
    label?: string;
}

export interface ContactEmail {
    id: number;
    contact_id: string;
    email: string;
    label?: string;
}

export interface Relationship {
    id: number;
    related_contact_id: string;
    type_id: string;
    label: string;
    first_name: string;
    surname: string;
}

export interface RelationshipType {
    type_id: string;
    label: string;
}

export interface MaritalStatus {
    status_id: string;
    marital_status: string;
}

export interface ContactOrganization {
    id: number;
    contact_id: string;
    organization_id: string;
    organization_name: string;
    achievement: string;
    date?: string;
}

export interface IdentityCard {
    id: number;
    contact_id: string;
    doc_type: string;
    card_number: string;
    issue_date?: string;
    expiry_date?: string;
}

export interface ContactKeyword {
    id: number;
    contact_id: string;
    keyword: string;
}

export interface ContactNote {
    id: number;
    contact_id: string;
    note: string;
}

export interface ContactUrl {
    id: number;
    contact_id: string;
    url: string;
    label?: string;
}

export interface ContactBankAccount {
    id: number;
    contact_id: string;
    bank_name?: string;
    account_number: string;
    account_type?: string;
    label?: string;
}

export interface ContactInput {
    first_name: string;
    middle_name?: string;
    surname: string;
    birthdate?: string;
    gender?: 'MALE' | 'FEMALE';
    status_id?: string;
}

export interface ContactsContextType {
    contacts: Contact[];
    contactsLoading: boolean;
    fetchContacts: () => Promise<Contact[]>;
    createContact: (data: ContactInput) => Promise<Contact | null>;
    getContact: (id: string) => Promise<Contact | null>;
    getRelationships: (contactId: string) => Promise<Relationship[]>;
    addRelationship: (contactId: string, relatedContactId: string, typeId: string) => Promise<boolean>;
    removeRelationship: (id: number) => Promise<boolean>;
    getRelationshipTypes: () => Promise<RelationshipType[]>;
    getMaritalStatuses: () => Promise<MaritalStatus[]>;
    getIdentityCards: (contactId: string) => Promise<IdentityCard[]>;
    addIdentityCard: (contactId: string, docType: string, cardNumber: string, issueDate?: string, expiryDate?: string) => Promise<boolean>;
    updateIdentityCard: (id: number, docType: string, cardNumber: string, issueDate?: string, expiryDate?: string) => Promise<boolean>;
    deleteIdentityCard: (id: number) => Promise<boolean>;
    getContactOrganizations: (contactId: string) => Promise<ContactOrganization[]>;
    addContactOrganization: (contactId: string, orgName: string, achievement: string, date?: string) => Promise<boolean>;
    updateContactOrganization: (id: number, orgName: string, achievement: string, date?: string) => Promise<boolean>;
    removeContactOrganization: (id: number) => Promise<boolean>;
    searchOrganizations: (query: string) => Promise<{ organization_id: string; name: string }[]>;
    deleteContact: (id: string) => Promise<boolean>;
    updateContact: (id: string, data: ContactInput) => Promise<boolean>;
    getContactPhones: (contactId: string) => Promise<ContactPhone[]>;
    addContactPhone: (contactId: string, phone: string, label?: string) => Promise<boolean>;
    updateContactPhone: (id: number, phone: string, label?: string) => Promise<boolean>;
    removeContactPhone: (id: number) => Promise<boolean>;
    getContactEmails: (contactId: string) => Promise<ContactEmail[]>;
    addContactEmail: (contactId: string, email: string, label?: string) => Promise<boolean>;
    updateContactEmail: (id: number, email: string, label?: string) => Promise<boolean>;
    removeContactEmail: (id: number) => Promise<boolean>;
    getContactKeywords: (contactId: string) => Promise<ContactKeyword[]>;
    addContactKeyword: (contactId: string, keyword: string) => Promise<boolean>;
    removeContactKeyword: (id: number) => Promise<boolean>;
    getContactNotes: (contactId: string) => Promise<ContactNote[]>;
    addContactNote: (contactId: string, note: string) => Promise<boolean>;
    removeContactNote: (id: number) => Promise<boolean>;
    getContactUrls: (contactId: string) => Promise<ContactUrl[]>;
    addContactUrl: (contactId: string, url: string, label?: string) => Promise<boolean>;
    removeContactUrl: (id: number) => Promise<boolean>;
    getBankAccounts: (contactId: string) => Promise<ContactBankAccount[]>;
    addBankAccount: (contactId: string, accountNumber: string, bankName?: string, accountType?: string, label?: string) => Promise<boolean>;
    updateBankAccount: (id: number, accountNumber: string, bankName?: string, accountType?: string, label?: string) => Promise<boolean>;
    deleteBankAccount: (id: number) => Promise<boolean>;
    searchAchievements: (query: string) => Promise<string[]>;
    searchBanks: (query: string) => Promise<string[]>;
    searchAccountTypes: (query: string) => Promise<string[]>;
    importVcf: (content: string) => Promise<{ imported: number; skipped: number }>;
    searchContacts: (query: string) => Promise<Contact[]>;
    // Sincronización entre dispositivos
    syncing: boolean;
    syncEnabled: boolean;
    lastSyncAt: number | null;
    setSyncEnabled: (enabled: boolean) => Promise<void>;
    syncNow: () => Promise<{ changed: boolean; error?: string }>;
}
