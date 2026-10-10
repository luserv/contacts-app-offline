import { test } from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import schema from '../utils/dbSchema.js';

const SQL = await initSqlJs();

const LEGACY_CONTACT_SQL = `CREATE TABLE contact (
  contact_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL,
  birthdate TEXT,
  gender TEXT CHECK(gender IN ('male', 'female')),
  status_id TEXT,
  updated_at TEXT
)`;

function makeLegacyDb() {
  const db = new SQL.Database();
  db.exec('CREATE TABLE marital_status (status_id TEXT PRIMARY KEY)');
  db.exec(LEGACY_CONTACT_SQL);
  db.run(`INSERT INTO contact VALUES ('c1', 'Ana', NULL, 'Diaz', NULL, 'female', NULL, '2024-05-01')`);
  return db;
}

function columnsOf(db, table) {
  return db.exec(`PRAGMA table_info(${table})`)[0].values.map(r => r[1]);
}

test('needsGenderMigration only flags the legacy lowercase CHECK', () => {
  assert.equal(schema.needsGenderMigration(LEGACY_CONTACT_SQL), true);
  assert.equal(schema.needsGenderMigration("gender TEXT CHECK(gender IN ('MALE', 'FEMALE'))"), false);
  assert.equal(schema.needsGenderMigration(undefined), false);
});

test('gender migration uppercases values and keeps updated_at when asked', () => {
  const db = makeLegacyDb();
  for (const sql of schema.genderMigrationStatements({ keepUpdatedAt: true })) db.exec(sql);

  assert.deepEqual(db.exec('SELECT gender, updated_at FROM contact')[0].values, [['FEMALE', '2024-05-01']]);
  const tableSql = db.exec("SELECT sql FROM sqlite_master WHERE name='contact'")[0].values[0][0];
  assert.equal(schema.needsGenderMigration(tableSql), false);
});

test('gender migration without updated_at reproduces the Electron rebuild', () => {
  const db = makeLegacyDb();
  for (const sql of schema.genderMigrationStatements({ keepUpdatedAt: false })) db.exec(sql);

  assert.equal(columnsOf(db, 'contact').includes('updated_at'), false);
  assert.deepEqual(db.exec('SELECT gender FROM contact')[0].values, [['FEMALE']]);
});

test('shouldTakeRemoteRow: missing or strictly older local loses, ties keep local', () => {
  assert.equal(schema.shouldTakeRemoteRow(null, '2024-01-01'), true);
  assert.equal(schema.shouldTakeRemoteRow('2024-01-01', null), true);
  assert.equal(schema.shouldTakeRemoteRow('2024-01-01', '2024-02-01'), true);
  assert.equal(schema.shouldTakeRemoteRow('2024-02-01', '2024-01-01'), false);
  assert.equal(schema.shouldTakeRemoteRow('2024-01-01', '2024-01-01'), false);
});

test('mergeRemoteRows routes contact rows to writeContact and replaces child rows by id', () => {
  const writes = [];
  const contacts = [];
  const target = {
    openTable: (table) => ({
      remoteRows: table === 'contact'
        ? [{ contact_id: 'c1', updated_at: '2024-02-01' }]
        : table === 'contact_phone' ? [{ id: 'p1', updated_at: '2024-02-01' }] : [],
      localUpdatedAt: () => '2024-01-01',
    }),
    run: (sql, params) => writes.push([sql.split(' ').slice(0, 2).join(' '), params]),
    writeContact: (row) => contacts.push(row.contact_id),
  };

  const result = schema.mergeRemoteRows(target);

  assert.equal(result.mergedRows, 2);
  assert.deepEqual(result.failedTables, []);
  assert.deepEqual(contacts, ['c1']);
  assert.deepEqual(writes.map(w => w[0]), ['DELETE FROM', 'INSERT INTO']);
  assert.deepEqual(writes[0][1], ['p1']);
});

test('mergeRemoteRows throws when every table fails', () => {
  const target = {
    openTable: () => { throw new Error('no such table'); },
    run: () => {},
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.throws(() => schema.mergeRemoteRows(target), /all tables failed/);
  } finally {
    console.warn = warn;
  }
});

test('computeSyncSignature sums row counts and skips tables that fail', () => {
  const signature = schema.computeSyncSignature((sql) => {
    if (sql.includes('FROM contact_keyword')) throw new Error('no such table');
    return { c: 2 };
  });
  assert.equal(signature, String((schema.SYNC_TABLES.length - 1) * 2));
});

test('missingUpdatedAtStatements adds a nullable updated_at only where it is missing', () => {
  const db = new SQL.Database();
  db.exec('CREATE TABLE contact (contact_id TEXT PRIMARY KEY, first_name TEXT)');
  db.run(`INSERT INTO contact VALUES ('c1', 'Ana')`);
  for (const table of schema.MERGE_TABLES.filter(t => t !== 'contact')) {
    db.exec(`CREATE TABLE ${table} (id TEXT PRIMARY KEY, updated_at TEXT)`);
  }

  const statements = schema.missingUpdatedAtStatements(table => columnsOf(db, table));
  assert.deepEqual(statements, ['ALTER TABLE contact ADD COLUMN updated_at TEXT']);

  for (const sql of statements) db.exec(sql);
  const localUpdatedAt = db.exec(`SELECT updated_at FROM contact WHERE contact_id = 'c1'`)[0].values[0][0];
  assert.equal(localUpdatedAt, null);
  assert.equal(schema.shouldTakeRemoteRow(localUpdatedAt, '2024-01-01'), true);
  assert.deepEqual(schema.missingUpdatedAtStatements(table => columnsOf(db, table)), []);
  db.close();
});
