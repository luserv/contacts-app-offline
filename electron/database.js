'use strict';

const { app } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const {
  createTablesSql,
  migrationsSql,
  seedSql,
  needsGenderMigration,
  genderMigrationStatements,
  mergeRemoteRows,
  computeSyncSignature,
} = require('../utils/dbSchema');

/** @typedef {import('better-sqlite3').Database} SqliteDatabase */

// User data path persists across app updates.
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'contacts.db');
const dbWalPath = `${dbPath}-wal`;
const dbShmPath = `${dbPath}-shm`;

/** @type {SqliteDatabase | null} */
let db = null;

/** @returns {SqliteDatabase} */
function requireDb() {
  if (!db) throw new Error('Database is not initialized');
  return db;
}

/**
 * Opens a better-sqlite3 connection. In production the module lives outside
 * the asar archive (asarUnpack), so it is required by absolute path.
 * @param {string} filePath
 * @returns {SqliteDatabase}
 */
function openSqliteFile(filePath) {
  const Database = require(app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3')
    : 'better-sqlite3');
  return new Database(filePath);
}

/** @param {string} targetPath */
function removeIfExists(targetPath) {
  try {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  } catch (_) {}
}

/** @param {string} prefix */
function tempDbPath(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}.db`);
}

// ── Schema bootstrap ─────────────────────────────────────────────────────────

/** @param {SqliteDatabase} database */
function runGenderMigration(database) {
  try {
    const schemaRow = /** @type {{ sql?: string } | undefined} */ (database.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='contact'"
    ).get());
    if (!needsGenderMigration(schemaRow?.sql)) return;

    database.pragma('foreign_keys = OFF');
    // Preserves Electron's historical rebuild without `updated_at` (see dbSchema.js).
    for (const sql of genderMigrationStatements({ keepUpdatedAt: false })) database.exec(sql);
    database.pragma('foreign_keys = ON');
  } catch (_) {
    try { database.pragma('foreign_keys = ON'); } catch (_) {}
  }
}

/** @param {SqliteDatabase} database */
function logIntegrityCheck(database) {
  try {
    const integrity = /** @type {{ integrity_check?: string } | undefined} */ (
      database.prepare('PRAGMA integrity_check').get()
    );
    if (!integrity || integrity.integrity_check !== 'ok') {
      console.error('[db] Integrity check failed:', integrity);
    }
  } catch (e) {
    console.warn('[db] Integrity check not supported:', e);
  }
}

/** Opens `contacts.db` in userData and brings its schema up to date. */
function initDB() {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const database = openSqliteFile(dbPath);
  db = database;
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  database.exec(createTablesSql);

  for (const sql of migrationsSql) {
    try { database.exec(sql); } catch (_) {}
  }

  runGenderMigration(database);

  database.exec(seedSql);

  logIntegrityCheck(database);
}

// ── Whole-file replace / snapshot ────────────────────────────────────────────

function closeDbConnection() {
  if (!db) return;
  try { db.pragma('wal_checkpoint(FULL)'); } catch (_) {}
  try { db.close(); } catch (_) {}
  db = null;
}

/**
 * Closes the connection, deletes the DB files, lets `writeNewFile` create the
 * new `contacts.db` and reopens it.
 * @param {(destination: string) => void} writeNewFile
 */
function replaceDatabaseFile(writeNewFile) {
  closeDbConnection();
  removeIfExists(dbWalPath);
  removeIfExists(dbShmPath);
  removeIfExists(dbPath);
  writeNewFile(dbPath);
  initDB();
}

/** @param {Buffer} buffer */
function replaceDatabaseFromBuffer(buffer) {
  replaceDatabaseFile(destination => fs.writeFileSync(destination, buffer));
}

/** @param {string} sourcePath */
function replaceDatabaseFromFile(sourcePath) {
  replaceDatabaseFile(destination => fs.copyFileSync(sourcePath, destination));
}

/** @param {unknown} value */
function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** @param {string} snapshotPath */
function createDatabaseSnapshot(snapshotPath) {
  removeIfExists(snapshotPath);
  const database = requireDb();
  database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  database.exec(`VACUUM INTO ${sqlString(snapshotPath)}`);
}

/** @returns {string} Consistent snapshot of the database, base64-encoded. */
function readDatabaseAsBase64() {
  const snapshotPath = tempDbPath('contacts-drive');
  try {
    createDatabaseSnapshot(snapshotPath);
    return fs.readFileSync(snapshotPath).toString('base64');
  } finally {
    removeIfExists(snapshotPath);
  }
}

// ── Drive merge / signature ──────────────────────────────────────────────────

/**
 * better-sqlite3 adapter for the shared merge rules (utils/dbSchema.js).
 * @param {SqliteDatabase} localDb
 * @param {SqliteDatabase} remoteDb
 * @returns {import('../utils/dbSchema').MergeTarget}
 */
function betterSqliteMergeTarget(localDb, remoteDb) {
  return {
    openTable(table, idColumn) {
      const remoteRows = /** @type {Record<string, unknown>[]} */ (
        remoteDb.prepare(`SELECT * FROM ${table}`).all()
      );
      const localStmt = localDb.prepare(`SELECT updated_at FROM ${table} WHERE ${idColumn} = ?`);
      return {
        remoteRows,
        localUpdatedAt: id => {
          const local = /** @type {{ updated_at?: string } | undefined} */ (localStmt.get(id));
          return local?.updated_at;
        },
      };
    },
    run(sql, params) {
      localDb.prepare(sql).run(...params);
    },
  };
}

/**
 * Merges a downloaded database into the local one (newer `updated_at` wins).
 * Throws when every table fails, so the renderer keeps its sync marker.
 * @param {string} base64
 */
function mergeDatabaseFromBase64(base64) {
  const localDb = requireDb();
  const snapshotPath = tempDbPath('contacts-merge');
  fs.writeFileSync(snapshotPath, Buffer.from(base64, 'base64'));
  const remoteDb = openSqliteFile(snapshotPath);

  try {
    localDb.pragma('foreign_keys = OFF');
    mergeRemoteRows(betterSqliteMergeTarget(localDb, remoteDb));
    localDb.pragma('foreign_keys = ON');
  } catch (e) {
    try { localDb.pragma('foreign_keys = ON'); } catch (_) {}
    throw e;
  } finally {
    remoteDb.close();
    removeIfExists(snapshotPath);
  }
}

/** @returns {string} */
function getDatabaseSignature() {
  // requireDb() inside the callback: a missing connection counts as 0 rows,
  // matching the previous per-table try/catch.
  return computeSyncSignature(sql =>
    /** @type {{ c: number } | undefined} */ (requireDb().prepare(sql).get()));
}

module.exports = {
  requireDb,
  initDB,
  replaceDatabaseFromBuffer,
  replaceDatabaseFromFile,
  createDatabaseSnapshot,
  readDatabaseAsBase64,
  mergeDatabaseFromBase64,
  getDatabaseSignature,
};
