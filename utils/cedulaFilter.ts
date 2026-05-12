import { db } from './db';

/**
 * Devuelve el conjunto de contact_id que tienen al menos una cédula
 * registrada en la tabla national_identity_card.
 */
export async function getContactIdsWithCedula(): Promise<Set<string>> {
  try {
    const rows = await db.getAllAsync<{ contact_id: string }>(
      "SELECT DISTINCT contact_id FROM national_identity_card WHERE doc_type = 'Cédula'"
    );
    return new Set(rows.map(r => r.contact_id));
  } catch (e) {
    console.error('getContactIdsWithCedula error:', e);
    return new Set();
  }
}
