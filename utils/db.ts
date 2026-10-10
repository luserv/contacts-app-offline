/**
 * Adaptador SQLite para Electron / Web.
 * - Electron: delega al proceso principal via window.electronDB (IPC).
 * - Browser: usa sql.js (WASM) con persistencia en IndexedDB.
 */
import { initializeDatabase } from './dbInit';
import { mergeSqlJsDatabases } from './dbMerge';
import dbSchema from './dbSchema.js';

const { computeSyncSignature } = dbSchema;

declare global {
  interface Window {
    electronDB: {
      getAllAsync: (sql: string, params: unknown[]) => Promise<unknown[]>;
      getFirstAsync: (sql: string, params: unknown[]) => Promise<unknown | null>;
      runAsync: (sql: string, params: unknown[]) => Promise<void>;
      execAsync: (sql: string) => Promise<void>;
    };
    electronDrive?: {
      readDBAsBase64: () => Promise<string>;
      writeDBFromBase64: (base64: string) => Promise<{ success?: boolean; error?: string }>;
      mergeDBFromBase64: (base64: string) => Promise<{ success?: boolean; error?: string }>;
      dbSignature: () => Promise<string>;
    };
  }
}

function hasElectronDB() {
  return typeof window !== 'undefined' && !!window.electronDB;
}

// ── IndexedDB persistence ──────────────────────────────────────
const IDB_NAME = 'contacts-app-db';
const IDB_STORE = 'sqlite';
const IDB_KEY = 'contacts.db';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const idb = (e.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) idb.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── sql.js singleton ───────────────────────────────────────────
let _SQL: any = null;
let _webDb: any = null;
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
let _dirty = false;

function schedulePersist() {
  _dirty = true;
  if (_persistTimer) return;
  _persistTimer = setTimeout(async () => {
    _persistTimer = null;
    if (_dirty && _webDb) {
      _dirty = false;
      try { await idbSet(IDB_KEY, _webDb.export()); } catch (e) {
        console.error('[db] persist failed:', e);
      }
    }
  }, 300);
}

async function flushPersist() {
  if (_persistTimer) { clearTimeout(_persistTimer); _persistTimer = null; }
  if (_dirty && _webDb) {
    _dirty = false;
    await idbSet(IDB_KEY, _webDb.export());
  }
}

async function getSqlJs(): Promise<any> {
  if (_SQL) return _SQL;
  const { default: initSqlJs } = await import('sql.js');
  _SQL = await initSqlJs({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.14.1/dist/${file}` });
  return _SQL;
}

async function getWebDb(): Promise<any> {
  if (_webDb) return _webDb;
  const SQL = await getSqlJs();
  const stored = await idbGet(IDB_KEY);
  _webDb = stored ? new SQL.Database(stored) : new SQL.Database();
  if (!stored) {
    await initializeDatabase(makeLocalAdapter(_webDb));
    schedulePersist();
  }
  return _webDb;
}

function sqlJsGetAll<T>(sqlDb: any, sql: string, params: unknown[]): T[] {
  const stmt = sqlDb.prepare(sql);
  if (params.length) stmt.bind(params as any);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as any);
  stmt.free();
  return rows;
}

function sqlJsGetFirst<T>(sqlDb: any, sql: string, params: unknown[]): T | null {
  const stmt = sqlDb.prepare(sql);
  if (params.length) stmt.bind(params as any);
  const row = stmt.step() ? stmt.getAsObject() as T : null;
  stmt.free();
  return row;
}

function sqlJsRun(sqlDb: any, sql: string, params: unknown[]): void {
  sqlDb.run(sql, params.length ? params as any : undefined);
}

function makeLocalAdapter(sqlDb: any) {
  return {
    execAsync: async (sql: string) => { sqlDb.exec(sql); },
    runAsync: async (sql: string, ...params: unknown[]) => { sqlJsRun(sqlDb, sql, params); },
    getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => sqlJsGetAll<T>(sqlDb, sql, params),
    getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => sqlJsGetFirst<T>(sqlDb, sql, params),
  };
}

// ── Utility functions ──────────────────────────────────────────
export async function reloadDatabase(): Promise<void> {}
export async function exportDatabaseToFile(_path: string): Promise<void> {}
export async function importDatabaseFromFile(_path: string): Promise<void> {}

export async function exportDatabaseToBase64(): Promise<string> {
  if (typeof window !== 'undefined' && window.electronDrive) {
    return window.electronDrive.readDBAsBase64();
  }
  return readDatabaseAsBase64();
}

export async function mergeDatabaseFromBase64(base64: string): Promise<void> {
  if (typeof window !== 'undefined' && window.electronDrive?.mergeDBFromBase64) {
    const r = await window.electronDrive.mergeDBFromBase64(base64);
    if (r?.error) throw new Error(r.error);
    return;
  }
  // Web: smart merge using updated_at
  await flushPersist();
  const SQL = await getSqlJs();
  const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const remoteDb = new SQL.Database(binary);
  const webDb = await getWebDb();

  try {
    // Throws when the merge fails entirely so the caller does not advance the sync marker.
    mergeSqlJsDatabases(webDb, remoteDb);
  } finally {
    remoteDb.close();
  }
  await idbSet(IDB_KEY, webDb.export());
}

export async function getDatabaseSignature(): Promise<string> {
  if (typeof window !== 'undefined' && window.electronDrive?.dbSignature) {
    return window.electronDrive.dbSignature();
  }
  const webDb = await getWebDb();
  return computeSyncSignature(sql => sqlJsGetFirst<{ c: number }>(webDb, sql, []));
}

export async function readDatabaseAsBase64(): Promise<string> {
  if (hasElectronDB()) return '';
  await flushPersist();
  const webDb = await getWebDb();
  const data: Uint8Array = webDb.export();
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function writeDatabaseFromBase64(base64: string): Promise<void> {
  if (hasElectronDB()) return;
  const SQL = await getSqlJs();
  const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  if (_webDb) { _webDb.close(); _webDb = null; }
  _webDb = new SQL.Database(binary);
  await idbSet(IDB_KEY, _webDb.export());
}

// ── DB adapter ─────────────────────────────────────────────────
export const db = {
  getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
    if (hasElectronDB()) return window.electronDB.getAllAsync(sql, params) as Promise<T[]>;
    return sqlJsGetAll<T>(await getWebDb(), sql, params);
  },

  getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
    if (hasElectronDB()) return window.electronDB.getFirstAsync(sql, params) as Promise<T | null>;
    return sqlJsGetFirst<T>(await getWebDb(), sql, params);
  },

  runAsync: async (sql: string, ...params: unknown[]): Promise<void> => {
    if (hasElectronDB()) return window.electronDB.runAsync(sql, params);
    sqlJsRun(await getWebDb(), sql, params);
    schedulePersist();
  },

  execAsync: async (sql: string): Promise<void> => {
    if (hasElectronDB()) return window.electronDB.execAsync(sql);
    const webDb = await getWebDb();
    webDb.exec(sql);
    schedulePersist();
  },
};
