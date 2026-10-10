/**
 * sql.js adapter for the shared Drive merge (rules live in dbSchema.js):
 * copies rows from a remote database into the local one when the remote
 * `updated_at` is newer (or the row is missing locally).
 * Kept free of browser/IndexedDB/Electron imports so it can be tested in Node.
 */
import type { Database, Statement } from 'sql.js';
import dbSchema from './dbSchema.js';

const { mergeRemoteRows } = dbSchema;

export const MERGE_TABLES: string[] = dbSchema.MERGE_TABLES;

export interface MergeResult {
  mergedRows: number;
  failedTables: string[];
}

type Row = Record<string, unknown>;

function* stepRows(stmt: Statement): Generator<Row> {
  while (stmt.step()) yield stmt.getAsObject();
}

function openSqlJsTable(localDb: Database, remoteDb: Database, table: string, idColumn: string) {
  const remoteStmt = remoteDb.prepare(`SELECT * FROM ${table}`);
  let localStmt: Statement;
  try {
    localStmt = localDb.prepare(`SELECT updated_at FROM ${table} WHERE ${idColumn} = ?`);
  } catch (e) {
    remoteStmt.free();
    throw e;
  }

  return {
    remoteRows: stepRows(remoteStmt),
    localUpdatedAt: (id: unknown) => {
      if (!id) return null;
      localStmt.bind([id as string | number]);
      const updatedAt = localStmt.step() ? localStmt.getAsObject().updated_at : null;
      localStmt.reset();
      return updatedAt;
    },
    // Free each statement exactly once, after the row loop.
    close: () => {
      localStmt.free();
      remoteStmt.free();
    },
  };
}

/**
 * Merges `remoteDb` into `localDb` (both sql.js Database instances).
 * Per-table errors are logged and reported in `failedTables`; if every table
 * fails the merge throws so callers do not treat it as a successful sync.
 */
export function mergeSqlJsDatabases(localDb: Database, remoteDb: Database): MergeResult {
  try {
    localDb.run('PRAGMA foreign_keys = OFF');
    return mergeRemoteRows({
      openTable: (table, idColumn) => openSqlJsTable(localDb, remoteDb, table, idColumn),
      run: (sql, params) => { localDb.run(sql, params as Parameters<Database['run']>[1]); },
    });
  } finally {
    try { localDb.run('PRAGMA foreign_keys = ON'); } catch (_) {}
  }
}
