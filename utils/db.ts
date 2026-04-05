/**
 * Adaptador SQLite para Electron / Web.
 * Las operaciones de DB van al proceso principal de Electron via IPC
 * (expuesto por electron/preload.js a través de contextBridge).
 */

declare global {
  interface Window {
    electronDB: {
      getAllAsync: (sql: string, params: unknown[]) => Promise<unknown[]>;
      getFirstAsync: (sql: string, params: unknown[]) => Promise<unknown | null>;
      runAsync: (sql: string, params: unknown[]) => Promise<void>;
      execAsync: (sql: string) => Promise<void>;
    };
  }
}

export const db = {
  getAllAsync: <T>(sql: string, ...params: unknown[]): Promise<T[]> =>
    window.electronDB.getAllAsync(sql, params) as Promise<T[]>,

  getFirstAsync: <T>(sql: string, ...params: unknown[]): Promise<T | null> =>
    window.electronDB.getFirstAsync(sql, params) as Promise<T | null>,

  runAsync: (sql: string, ...params: unknown[]): Promise<void> =>
    window.electronDB.runAsync(sql, params),

  execAsync: (sql: string): Promise<void> =>
    window.electronDB.execAsync(sql),
};
