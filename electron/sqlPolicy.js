'use strict';

// Only allow PRAGMA, known DDL and transaction control via db:exec —
// parameterized queries go through db:run/db:getAll/db:getFirst.
const ALLOWED_EXEC_PREFIXES = ['PRAGMA ', 'CREATE ', 'ALTER TABLE ', 'DROP TABLE IF'];

// Exact statements only (optional trailing semicolon), never a prefix,
// so something like `BEGIN; DROP TABLE contact` stays blocked.
const TRANSACTION_CONTROL_RE = /^(BEGIN(\s+TRANSACTION)?|COMMIT|END|ROLLBACK)\s*;?$/;

/**
 * @param {unknown} sql
 * @returns {boolean}
 */
function isAllowedExecSql(sql) {
  if (typeof sql !== 'string') return false;
  const trimmed = sql.trim().toUpperCase();
  if (TRANSACTION_CONTROL_RE.test(trimmed)) return true;
  return ALLOWED_EXEC_PREFIXES.some(p => trimmed.startsWith(p));
}

module.exports = { isAllowedExecSql };
