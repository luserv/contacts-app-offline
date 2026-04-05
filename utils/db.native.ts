/**
 * Adaptador SQLite para Android / iOS (Metro resuelve .native.ts automáticamente).
 * Usa la API síncrona de expo-sqlite v16 envuelta en Promises para mantener
 * la misma interfaz que el adaptador de Electron.
 */
import * as SQLite from 'expo-sqlite';
import { initializeDatabase } from './dbInit';

const _db = SQLite.openDatabaseSync('contacts.db');

// Inicialización síncrona al cargar el módulo
(async () => {
  await initializeDatabase({
    execAsync: (sql) => { _db.execSync(sql); return Promise.resolve(); },
    runAsync: (sql, ...p) => { _db.runSync(sql, p); return Promise.resolve(); },
    getAllAsync: () => Promise.resolve([]),
    getFirstAsync: () => Promise.resolve(null),
  });
})();

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
