import { db } from './db';
import { toDisplay } from './contactUtils';
import { getInverseType } from './contactsRelationship';
import type { ContactsContextType, Relationship, RelationshipType } from './contactsTypes';

export function createContactsRelationshipActions(): Pick<
    ContactsContextType,
    'getRelationships' | 'addRelationship' | 'removeRelationship' | 'getRelationshipTypes'
> {
    const getRelationships = async (contactId: string): Promise<Relationship[]> => {
        try {
            const result = await db.getAllAsync<Relationship>(`
                SELECT
                    cr.id,
                    cr.related_contact_id,
                    cr.type_id,
                    rt.label,
                    c.first_name,
                    c.surname
                FROM contact_relationship cr
                JOIN relationship_type rt ON cr.type_id = rt.type_id
                JOIN contact c ON cr.related_contact_id = c.contact_id
                WHERE cr.contact_id = ?
                ORDER BY rt.label ASC;
            `, contactId);
            return result.map(r => ({
                ...r,
                first_name: toDisplay(r.first_name),
                surname: toDisplay(r.surname),
            }));
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const addRelationship = async (contactId: string, relatedContactId: string, typeId: string): Promise<boolean> => {
        try {
            const existing = await db.getFirstAsync<{ id: number }>(
                'SELECT id FROM contact_relationship WHERE contact_id = ? AND related_contact_id = ? AND type_id = ?',
                contactId, relatedContactId, typeId
            );
            if (existing) return false;

            await db.runAsync(
                'INSERT INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                contactId, relatedContactId, typeId
            );

            const [contactA, contactB] = await Promise.all([
                db.getFirstAsync<{ gender: 'MALE' | 'FEMALE' | null }>('SELECT gender FROM contact WHERE contact_id = ?', contactId),
                db.getFirstAsync<{ gender: 'MALE' | 'FEMALE' | null }>('SELECT gender FROM contact WHERE contact_id = ?', relatedContactId),
            ]);
            const genderA = contactA?.gender ?? null;
            const genderB = contactB?.gender ?? null;

            const inverseTypeId = getInverseType(typeId, genderA);
            if (inverseTypeId) {
                await db.runAsync(
                    'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                    relatedContactId, contactId, inverseTypeId
                );
            }

            if (typeId === 'hermano' || typeId === 'hermana') {
                const siblingsOfA = await db.getAllAsync<{ related_contact_id: string }>(
                    `SELECT related_contact_id FROM contact_relationship
                     WHERE contact_id = ? AND type_id IN ('hermano', 'hermana') AND related_contact_id != ?`,
                    contactId, relatedContactId
                );

                for (const { related_contact_id: siblingId } of siblingsOfA) {
                    const sibling = await db.getFirstAsync<{ gender: 'MALE' | 'FEMALE' | null }>(
                        'SELECT gender FROM contact WHERE contact_id = ?', siblingId
                    );
                    const genderSibling = sibling?.gender ?? null;

                    const typeBtoSibling = genderSibling === 'FEMALE' ? 'hermana' : 'hermano';
                    const typeSiblingToB = genderB === 'FEMALE' ? 'hermana' : 'hermano';

                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        relatedContactId, siblingId, typeBtoSibling
                    );
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        siblingId, relatedContactId, typeSiblingToB
                    );
                }

                const parentsOfA = await db.getAllAsync<{ related_contact_id: string; type_id: string }>(
                    `SELECT related_contact_id, type_id FROM contact_relationship
                     WHERE contact_id = ? AND type_id IN ('padre', 'madre')`,
                    contactId
                );
                for (const { related_contact_id: parentId, type_id: parentTypeId } of parentsOfA) {
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        relatedContactId, parentId, parentTypeId
                    );
                    const childType = genderB === 'FEMALE' ? 'hija' : 'hijo';
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        parentId, relatedContactId, childType
                    );
                }

                const parentsOfB = await db.getAllAsync<{ related_contact_id: string; type_id: string }>(
                    `SELECT related_contact_id, type_id FROM contact_relationship
                     WHERE contact_id = ? AND type_id IN ('padre', 'madre')`,
                    relatedContactId
                );
                for (const { related_contact_id: parentId, type_id: parentTypeId } of parentsOfB) {
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        contactId, parentId, parentTypeId
                    );
                    const childType = genderA === 'FEMALE' ? 'hija' : 'hijo';
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        parentId, contactId, childType
                    );
                }
            }

            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const removeRelationship = async (id: number): Promise<boolean> => {
        try {
            const rel = await db.getFirstAsync<{ contact_id: string; related_contact_id: string; type_id: string }>(
                'SELECT contact_id, related_contact_id, type_id FROM contact_relationship WHERE id = ?', id
            );
            if (rel) {
                const contact = await db.getFirstAsync<{ gender: 'MALE' | 'FEMALE' | null }>(
                    'SELECT gender FROM contact WHERE contact_id = ?', rel.contact_id
                );
                const inverseTypeId = getInverseType(rel.type_id, contact?.gender ?? null);
                if (inverseTypeId) {
                    await db.runAsync(
                        'DELETE FROM contact_relationship WHERE contact_id = ? AND related_contact_id = ? AND type_id = ?',
                        rel.related_contact_id, rel.contact_id, inverseTypeId
                    );
                }
            }
            await db.runAsync('DELETE FROM contact_relationship WHERE id = ?', id);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const getRelationshipTypes = async (): Promise<RelationshipType[]> => {
        try {
            return await db.getAllAsync<RelationshipType>('SELECT * FROM relationship_type ORDER BY label ASC;');
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    return {
        getRelationships,
        addRelationship,
        removeRelationship,
        getRelationshipTypes,
    };
}
