/**
 * Inicialización del esquema de base de datos.
 * Acepta cualquier objeto que implemente la interfaz mínima de DB
 * para que funcione tanto con expo-sqlite (native) como con el
 * adaptador IPC de Electron.
 *
 * El SQL vive en dbSchema.js (fuente única de verdad compartida con Electron main).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createTablesSql, migrationsSql, seedSql } = require('./dbSchema');

interface MinimalDB {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<void>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
}

const TAG = '[dbInit]';

function logWarn(msg: string, ...args: unknown[]) {
  console.warn(`${TAG} ${msg}`, ...args);
}

function logInfo(msg: string) {
  console.log(`${TAG} ${msg}`);
}

export async function initializeDatabase(db: MinimalDB) {
  await db.execAsync(createTablesSql);

  for (const sql of migrationsSql as string[]) {
    try { await db.execAsync(sql); } catch (_) {}
  }

  // Migración: normalizar gender a mayúsculas y actualizar CHECK constraint
  try {
    const schemaRow = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='contact'"
    );
    if (schemaRow?.sql?.includes("'male'")) {
      logInfo('Migrating gender column to uppercase...');
      await db.execAsync('PRAGMA foreign_keys = OFF');
      await db.execAsync('DROP TABLE IF EXISTS contact_gender_tmp');
      await db.execAsync(`CREATE TABLE contact_gender_tmp (
        contact_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        surname TEXT NOT NULL,
        birthdate TEXT,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE')),
        status_id TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (status_id) REFERENCES marital_status (status_id)
      )`);
      await db.execAsync(
        `INSERT INTO contact_gender_tmp
         SELECT contact_id, first_name, middle_name, surname, birthdate, UPPER(gender), status_id, updated_at
         FROM contact`
      );
      await db.execAsync('DROP TABLE contact');
      await db.execAsync('ALTER TABLE contact_gender_tmp RENAME TO contact');
      await db.execAsync('PRAGMA foreign_keys = ON');
      logInfo('Gender migration complete.');
    }
  } catch (e) {
    logWarn('Gender migration skipped:', e);
    try { await db.execAsync('PRAGMA foreign_keys = ON'); } catch (_) {}
  }

  // Crear índices adicionales si no existen
  try {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_contact_phone_contact ON contact_phone(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_email_contact ON contact_email(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_note_contact ON contact_note(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_url_contact ON contact_url(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_keyword_contact ON contact_keyword(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_keyword_keyword ON contact_keyword(keyword);
      CREATE INDEX IF NOT EXISTS idx_identity_card_contact ON national_identity_card(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_org_contact ON contact_organization(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_org_org ON contact_organization(organization_id);
      CREATE INDEX IF NOT EXISTS idx_contact_bank_contact ON contact_bank_account(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_relationship_contact ON contact_relationship(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_relationship_related ON contact_relationship(related_contact_id);
      CREATE INDEX IF NOT EXISTS idx_organization_name ON organization(name);
    `);
  } catch (_) {}

  await db.execAsync(seedSql);

  // Verificar integridad de la base de datos
  try {
    const integrity = await db.getAllAsync<{ integrity_check: string }>(
      'PRAGMA integrity_check'
    );
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
      logWarn('Database integrity check failed:', integrity);
    }
  } catch (e) {
    logWarn('Integrity check not supported:', e);
  }
}
