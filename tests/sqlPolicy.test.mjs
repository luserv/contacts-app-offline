import { test } from 'node:test';
import assert from 'node:assert/strict';
import sqlPolicy from '../electron/sqlPolicy.js';

const { isAllowedExecSql } = sqlPolicy;

test('allows exact transaction-control statements', () => {
  for (const sql of ['BEGIN', 'begin', 'BEGIN TRANSACTION', '  Begin  Transaction ;', 'COMMIT', 'commit;',
    'ROLLBACK', 'END', 'END;']) {
    assert.equal(isAllowedExecSql(sql), true, sql);
  }
});

test('blocks statements chained after transaction control', () => {
  for (const sql of ['BEGIN; DROP TABLE contact', 'COMMIT; DELETE FROM contact', 'BEGIN IMMEDIATE; x',
    'ROLLBACK TO sp1', 'BEGINX', 'END TRANSACTION; DROP TABLE contact']) {
    assert.equal(isAllowedExecSql(sql), false, sql);
  }
});

test('keeps the existing PRAGMA/DDL allowlist and blocks DML', () => {
  assert.equal(isAllowedExecSql('PRAGMA foreign_keys = OFF'), true);
  assert.equal(isAllowedExecSql('CREATE INDEX IF NOT EXISTS i ON t(c)'), true);
  assert.equal(isAllowedExecSql('ALTER TABLE contact ADD COLUMN x TEXT'), true);
  assert.equal(isAllowedExecSql('DROP TABLE IF EXISTS tmp'), true);
  assert.equal(isAllowedExecSql('DELETE FROM contact'), false);
  assert.equal(isAllowedExecSql('INSERT INTO contact VALUES (1)'), false);
  assert.equal(isAllowedExecSql(undefined), false);
});
