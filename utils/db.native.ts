/**
 * Adaptador SQLite para Android / iOS (Metro resuelve .native.ts automáticamente).
 * Usa la API síncrona de expo-sqlite v16 envuelta en Promises para mantener
 * la misma interfaz que el adaptador de Electron.
 */
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { initializeDatabase } from './dbInit';
import dbSchema from './dbSchema.js';

const { mergeRemoteRows, computeSyncSignature } = dbSchema;

const EncodingType = (FileSystem as any).EncodingType || { Base64: 'base64' };

let _db = SQLite.openDatabaseSync('contacts.db');

function makeAdapter() {
  return {
    execAsync: (sql: string) => { _db.execSync(sql); return Promise.resolve(); },
    runAsync: (sql: string, ...p: unknown[]) => { _db.runSync(sql, p as any); return Promise.resolve(); },
    getAllAsync: () => Promise.resolve([]),
    getFirstAsync: () => Promise.resolve(null),
  };
}

// Inicialización síncrona al cargar el módulo — garantizar que termine antes de usar _db
const _initPromise = initializeDatabase(makeAdapter()).catch((e) => {
  console.warn('[db.native] init error:', e);
});

export async function waitForDbReady(): Promise<void> {
  await _initPromise;
}

function uniqueTempDbName(prefix: string): string {
  return `${prefix}-${Date.now()}.db`;
}

/** Joins a FileSystem directory URI and a file name. */
function cachePath(cacheDir: string, fileName: string): string {
  return cacheDir.endsWith('/') ? `${cacheDir}${fileName}` : `${cacheDir}/${fileName}`;
}

function closeDatabase(database: SQLite.SQLiteDatabase) {
  try { database.closeSync(); } catch (_) {}
}

/**
 * Asegura que el directorio de bases de datos de SQLite exista.
 * En lugar de intentar crearlo manualmente (que puede fallar por permisos de URI),
 * abrimos y cerramos una base de datos temporal, lo cual obliga a expo-sqlite
 * a crear el directorio necesario de forma segura.
 */
async function ensureDatabaseDirectory() {
  const tempDb = SQLite.openDatabaseSync('__temp_init__.db');
  try {
    tempDb.closeSync();
    SQLite.deleteDatabaseSync('__temp_init__.db');
  } catch (_) {}
}

export async function exportDatabaseToFile(destinationPath: string): Promise<void> {
  await ensureDatabaseDirectory();
  
  // Asegurar que todos los cambios en WAL se escriban en el archivo principal antes del backup
  try {
    _db.execSync('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch (e) {
    console.warn('Error en wal_checkpoint:', e);
  }

  const tempName = uniqueTempDbName('contacts-export');
  // En Android, expo-file-system no puede leer/copiar desde .../files/SQLite/.
  // Por eso generamos el snapshot en cacheDirectory (que sí es accesible) y luego
  // lo copiamos al destino solicitado.
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('FileSystem.cacheDirectory no disponible');
  }
  const tempPath = cachePath(cacheDir, tempName);
  const snapshotDb = SQLite.openDatabaseSync(tempName, undefined, cacheDir);

  try {
    SQLite.backupDatabaseSync({
      sourceDatabase: _db,
      destDatabase: snapshotDb,
    });

    if (destinationPath !== tempPath) {
      await FileSystem.copyAsync({ from: tempPath, to: destinationPath });
    }
  } finally {
    closeDatabase(snapshotDb);
    try { SQLite.deleteDatabaseSync(tempName, cacheDir); } catch (_) {}
    try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch (_) {}
  }
}

export async function importDatabaseFromFile(sourcePath: string): Promise<void> {
  await ensureDatabaseDirectory();
  const tempName = uniqueTempDbName('contacts-import');
  // No escribir bajo SQLite/defaultDatabaseDirectory: en Android, copyAsync de
  // expo-file-system rechaza .../files/SQLite/ ("isn't writable") aunque expo-sqlite
  // abra BDs ahí. Caché sí es escribible; abrimos la copia temporal con el mismo directorio.
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('FileSystem.cacheDirectory no disponible');
  }
  const tempPath = cachePath(cacheDir, tempName);
  let sourceDb: SQLite.SQLiteDatabase | null = null;

  try {
    await FileSystem.copyAsync({ from: sourcePath, to: tempPath });
    sourceDb = SQLite.openDatabaseSync(tempName, undefined, cacheDir);

    closeDatabase(_db);
    try { SQLite.deleteDatabaseSync('contacts.db', SQLite.defaultDatabaseDirectory); } catch (_) {}

    _db = SQLite.openDatabaseSync('contacts.db');
    SQLite.backupDatabaseSync({
      sourceDatabase: sourceDb,
      destDatabase: _db,
    });

    // Forzar el guardado en el archivo principal tras la restauración
    try {
      _db.execSync('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (e) {
      console.warn('Error en wal_checkpoint tras restauración:', e);
    }

    await initializeDatabase(makeAdapter());
  } finally {
    if (sourceDb) closeDatabase(sourceDb);
    try { SQLite.deleteDatabaseSync(tempName, cacheDir); } catch (_) {}
  }
}

type Row = Record<string, unknown>;

/**
 * expo-sqlite adapter for the shared merge rules (dbSchema.js).
 * Platform behavior kept as-is: foreign keys are not toggled during the merge and
 * `contact` rows are written with INSERT OR REPLACE over a fixed column list.
 */
function expoSqliteMergeTarget(localDb: SQLite.SQLiteDatabase, remoteDb: SQLite.SQLiteDatabase) {
  return {
    openTable: (table: string, idColumn: string) => ({
      remoteRows: remoteDb.getAllSync<Row>(`SELECT * FROM ${table}`),
      localUpdatedAt: (id: unknown) => localDb.getFirstSync<{ updated_at: string }>(
        `SELECT updated_at FROM ${table} WHERE ${idColumn} = ?`, id as SQLite.SQLiteBindValue
      )?.updated_at,
    }),
    run: (sql: string, params: unknown[]) => {
      localDb.runSync(sql, params as SQLite.SQLiteBindValue[]);
    },
    writeContact: (row: Row) => {
      localDb.runSync(
        `INSERT OR REPLACE INTO contact (contact_id, first_name, middle_name, surname, birthdate, gender, status_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.contact_id, row.first_name, row.middle_name, row.surname,
          row.birthdate, row.gender, row.status_id, row.updated_at] as SQLite.SQLiteBindValue[]
      );
    },
  };
}

export async function exportDatabaseToBase64(): Promise<string> {
  return readDatabaseAsBase64();
}

export async function mergeDatabaseFromBase64(base64: string): Promise<void> {
  // Smart merge using updated_at
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('FileSystem.cacheDirectory not available');
  }
  // Open exactly the file that was written: same name, same directory. expo-sqlite
  // parses the `file://` URI itself (toUri().path), so the scheme can stay.
  const tempName = uniqueTempDbName('contacts-merge');
  const tempPath = cachePath(cacheDir, tempName);

  try {
    await FileSystem.writeAsStringAsync(tempPath, base64, { encoding: EncodingType.Base64 });
    // If the downloaded file cannot be opened, this throws and the caller keeps its sync marker.
    const sourceDb = SQLite.openDatabaseSync(tempName, undefined, cacheDir);

    try {
      // Throws when every table fails, so the caller keeps its sync marker.
      mergeRemoteRows(expoSqliteMergeTarget(_db, sourceDb));
    } finally {
      closeDatabase(sourceDb);
      try { SQLite.deleteDatabaseSync(tempName, cacheDir); } catch (_) {}
    }

    try { _db.execSync('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (_) {}
  } finally {
    try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch (_) {}
  }
}

export async function getDatabaseSignature(): Promise<string> {
  return computeSyncSignature(sql => _db.getFirstSync<{ c: number }>(sql));
}

export async function readDatabaseAsBase64(): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory ?? '';
  const tempPath = cachePath(cacheDir, uniqueTempDbName('contacts-drive'));
  await exportDatabaseToFile(tempPath);

  try {
    return await FileSystem.readAsStringAsync(tempPath, {
      encoding: EncodingType.Base64,
    });
  } finally {
    try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch (_) {}
  }
}

export async function writeDatabaseFromBase64(base64: string): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory ?? '';
  const tempPath = cachePath(cacheDir, uniqueTempDbName('contacts-restore'));

  try {
    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: EncodingType.Base64,
    });
    await importDatabaseFromFile(tempPath);
  } finally {
    try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch (_) {}
  }
}

/** Cierra la conexión actual y la reabre (necesario tras reemplazar el archivo en disco). */
export async function reloadDatabase(): Promise<void> {
  closeDatabase(_db);
  _db = SQLite.openDatabaseSync('contacts.db');
  await initializeDatabase(makeAdapter());
}

export const db = {
  getAllAsync: <T>(sql: string, ...params: unknown[]): Promise<T[]> =>
    Promise.resolve(_db.getAllSync<T>(sql, params as any)),

  getFirstAsync: <T>(sql: string, ...params: unknown[]): Promise<T | null> =>
    Promise.resolve(_db.getFirstSync<T>(sql, params as any) ?? null),

  runAsync: (sql: string, ...params: unknown[]): Promise<void> => {
    _db.runSync(sql, params as any);
    return Promise.resolve();
  },

  execAsync: (sql: string): Promise<void> => {
    _db.execSync(sql);
    return Promise.resolve();
  },
};
