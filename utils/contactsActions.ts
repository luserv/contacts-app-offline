import { createContactsChannelActions } from './contactsActions.channels';
import { createContactsCoreActions } from './contactsActions.core';
import { createContactsRecordActions } from './contactsActions.records';
import { createContactsRelationshipActions } from './contactsActions.relationships';
import type { CreateContactsActionsParams } from './contactsActionsShared';
import type { ContactsContextType } from './contactsTypes';

export function createContactsActions(
    params: CreateContactsActionsParams
): Omit<ContactsContextType, 'contacts'> {
    return {
        ...createContactsCoreActions(params),
        ...createContactsRelationshipActions(),
        ...createContactsChannelActions(),
        ...createContactsRecordActions(params),
    };
}
