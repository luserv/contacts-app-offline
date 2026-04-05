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
        FOREIGN KEY (status_id) REFERENCES marital_status (status_id)
      )`);
      await db.execAsync(
        `INSERT INTO contact_gender_tmp
         SELECT contact_id, first_name, middle_name, surname, birthdate, UPPER(gender), status_id
         FROM contact`
      );
      await db.execAsync('DROP TABLE contact');
      await db.execAsync('ALTER TABLE contact_gender_tmp RENAME TO contact');
      await db.execAsync('PRAGMA foreign_keys = ON');
    }
  } catch (_) {
    try { await db.execAsync('PRAGMA foreign_keys = ON'); } catch (_) {}
  }

  await db.execAsync(seedSql);
}
