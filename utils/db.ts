/**
 * Adaptador SQLite para Electron / Web.
 * - Electron: delega al proceso principal via window.electronDB (IPC).
 * - Browser: usa sql.js (WASM) con persistencia en IndexedDB.
 */
import { initializeDatabase } from './dbInit';

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
    await persistWebDb();
  }
  return _webDb;
}

async function persistWebDb(): Promise<void> {
  if (!_webDb) return;
  await idbSet(IDB_KEY, _webDb.export());
}

function makeLocalAdapter(sqlDb: any) {
  return {
    execAsync: async (sql: string) => { sqlDb.exec(sql); },
    runAsync: async (sql: string, ...params: unknown[]) => {
      sqlDb.run(sql, params.length ? params as any : undefined);
    },
    getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
      const stmt = sqlDb.prepare(sql);
      if (params.length) stmt.bind(params as any);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as any);
      stmt.free();
      return rows;
    },
    getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
      const stmt = sqlDb.prepare(sql);
      if (params.length) stmt.bind(params as any);
      const row = stmt.step() ? stmt.getAsObject() as T : null;
      stmt.free();
      return row;
    },
  };
}

// ── Utility functions ──────────────────────────────────────────
export async function reloadDatabase(): Promise<void> {}
export async function exportDatabaseToFile(_path: string): Promise<void> {}
export async function importDatabaseFromFile(_path: string): Promise<void> {}

const SYNC_TABLES_WEB = [
  'contact', 'contact_phone', 'contact_email', 'contact_note',
  'contact_url', 'contact_bank_account', 'contact_relationship',
  'contact_keyword', 'national_identity_card', 'contact_organization',
];

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
  await writeDatabaseFromBase64(base64);
}

export async function getDatabaseSignature(): Promise<string> {
  if (typeof window !== 'undefined' && window.electronDrive?.dbSignature) {
    return window.electronDrive.dbSignature();
  }
  const webDb = await getWebDb();
  let total = 0;
  for (const table of SYNC_TABLES_WEB) {
    try {
      const stmt = webDb.prepare(`SELECT COUNT(*) c FROM ${table}`);
      if (stmt.step()) total += (stmt.getAsObject() as any).c as number;
      stmt.free();
    } catch {}
  }
  return String(total);
}

export async function readDatabaseAsBase64(): Promise<string> {
  if (hasElectronDB()) return '';
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
  await persistWebDb();
}

// ── DB adapter ─────────────────────────────────────────────────
export const db = {
  getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
    if (hasElectronDB()) return window.electronDB.getAllAsync(sql, params) as Promise<T[]>;
    const webDb = await getWebDb();
    const stmt = webDb.prepare(sql);
    if (params.length) stmt.bind(params as any);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as any);
    stmt.free();
    return rows;
  },

  getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
    if (hasElectronDB()) return window.electronDB.getFirstAsync(sql, params) as Promise<T | null>;
    const webDb = await getWebDb();
    const stmt = webDb.prepare(sql);
    if (params.length) stmt.bind(params as any);
    const row = stmt.step() ? stmt.getAsObject() as T : null;
    stmt.free();
    return row;
  },

  runAsync: async (sql: string, ...params: unknown[]): Promise<void> => {
    if (hasElectronDB()) return window.electronDB.runAsync(sql, params);
    const webDb = await getWebDb();
    webDb.run(sql, params.length ? params as any : undefined);
    await persistWebDb();
  },

  execAsync: async (sql: string): Promise<void> => {
    if (hasElectronDB()) return window.electronDB.execAsync(sql);
    const webDb = await getWebDb();
    webDb.exec(sql);
    await persistWebDb();
  },
};
