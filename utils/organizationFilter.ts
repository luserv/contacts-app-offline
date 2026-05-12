import { db } from './db';
import { toDisplay } from './contactUtils';

/**
 * Devuelve el conjunto de contact_id que tienen al menos una vinculación
 * en la tabla contact_organization.
 */
export async function getContactIdsWithOrganization(): Promise<Set<string>> {
  try {
    const rows = await db.getAllAsync<{ contact_id: string }>(
      'SELECT DISTINCT contact_id FROM contact_organization'
    );
    return new Set(rows.map(r => r.contact_id));
  } catch (e) {
    console.error('getContactIdsWithOrganization error:', e);
    return new Set();
  }
}

/**
 * Devuelve el conjunto de contact_id vinculados a una organización específica.
 */
export async function getContactIdsByOrganization(organizationId: string): Promise<Set<string>> {
  try {
    const rows = await db.getAllAsync<{ contact_id: string }>(
      'SELECT DISTINCT contact_id FROM contact_organization WHERE organization_id = ?',
      organizationId
    );
    return new Set(rows.map(r => r.contact_id));
  } catch (e) {
    console.error('getContactIdsByOrganization error:', e);
    return new Set();
  }
}

/**
 * Devuelve el catálogo completo de organizaciones (con el nombre ya formateado
 * para mostrar) para el selector del filtro.
 */
export async function getAllOrganizations(): Promise<{ organization_id: string; name: string }[]> {
  try {
    const rows = await db.getAllAsync<{ organization_id: string; name: string }>(
      'SELECT organization_id, name FROM organization ORDER BY name ASC'
    );
    return rows.map(r => ({ ...r, name: toDisplay(r.name) }));
  } catch (e) {
    console.error('getAllOrganizations error:', e);
    return [];
  }
}
