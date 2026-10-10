import { test } from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import schema from '../utils/dbSchema.js';
import { mergeSqlJsDatabases } from '../utils/dbMerge.ts';

const SQL = await initSqlJs();

function makeDb() {
  const db = new SQL.Database();
  db.exec(schema.createTablesSql);
  for (const sql of schema.migrationsSql) {
    try { db.exec(sql); } catch (_) {}
  }
  return db;
}

function count(db, sql) {
  const res = db.exec(sql);
  return res[0].values[0][0];
}

test('merges every new or newer remote row in a table, not just the first', () => {
  const local = makeDb();
  const remote = makeDb();

  local.run(`INSERT INTO contact (contact_id, first_name, surname, updated_at)
    VALUES ('c1', 'Old', 'One', '2024-01-01 00:00:00')`);

  remote.run(`INSERT INTO contact (contact_id, first_name, surname, updated_at)
    VALUES ('c1', 'New', 'One', '2025-01-01 00:00:00')`);
  remote.run(`INSERT INTO contact (contact_id, first_name, surname, updated_at)
    VALUES ('c2', 'Second', 'Two', '2025-01-01 00:00:00')`);
  remote.run(`INSERT INTO contact (contact_id, first_name, surname, updated_at)
    VALUES ('c3', 'Third', 'Three', '2025-01-01 00:00:00')`);
  remote.run(`INSERT INTO contact_phone (id, contact_id, phone, updated_at)
    VALUES (1, 'c2', '111', '2025-01-01 00:00:00')`);
  remote.run(`INSERT INTO contact_phone (id, contact_id, phone, updated_at)
    VALUES (2, 'c3', '222', '2025-01-01 00:00:00')`);

  const result = mergeSqlJsDatabases(local, remote);

  assert.equal(count(local, 'SELECT COUNT(*) FROM contact'), 3);
  assert.equal(count(local, "SELECT first_name FROM contact WHERE contact_id = 'c1'"), 'New');
  assert.equal(count(local, 'SELECT COUNT(*) FROM contact_phone'), 2);
  assert.equal(result.mergedRows, 5);
  assert.deepEqual(result.failedTables, []);
});

test('keeps the local row when it is newer than the remote one', () => {
  const local = makeDb();
  const remote = makeDb();

  local.run(`INSERT INTO contact (contact_id, first_name, surname, updated_at)
    VALUES ('c1', 'Local', 'One', '2026-01-01 00:00:00')`);
  remote.run(`INSERT INTO contact (contact_id, first_name, surname, updated_at)
    VALUES ('c1', 'Remote', 'One', '2025-01-01 00:00:00')`);

  const result = mergeSqlJsDatabases(local, remote);

  assert.equal(count(local, "SELECT first_name FROM contact WHERE contact_id = 'c1'"), 'Local');
  assert.equal(result.mergedRows, 0);
});

test('throws when every table fails to merge', () => {
  const local = makeDb();
  const remote = new SQL.Database(); // no schema: every SELECT fails

  assert.throws(() => mergeSqlJsDatabases(local, remote), /all tables failed/);
});
