# Sync critical fixes

## Objective
Fix the three critical defects found in the 2026-10-09 audit, each covered by a test where a runner is feasible.

## Problem / Why
- Android pull merge opens an empty DB (`contacts-merge-temp`) instead of the downloaded file; errors are swallowed and the sync marker advances, so remote changes are lost forever.
- Web merge calls `localStmt.free()` inside the row loop, so each table merges at most one row.
- Electron `db:exec` allowlist blocks `BEGIN`/`COMMIT`/`ROLLBACK`, so `deleteContact` always fails on desktop.

## Scope / Constraints
- Minimal fixes only; no merge redesign (tombstones, transactions, signature) in this feature.
- Branch: `fix/sync-critical-bugs` (carries the user's pre-existing uncommitted WIP from main).
- No test suite exists; add the smallest runner needed (Node built-in test runner preferred).

## Tasks
- [x] T1 — Web merge: free `localStmt` once after the loop; regression test with sql.js (merges >1 row per table). Route: delegated writer (2+ non-trivial files incl. test infra).
- [x] T2 — Android merge: open the same file that was written; do not advance sync marker when merge fails. Test: none runnable (expo-sqlite needs device) — structural check + tsc. Route: delegated writer.
- [x] T3 — Electron: allow transaction control statements in `db:exec` (BEGIN/COMMIT/ROLLBACK) without opening arbitrary SQL. Test: unit test on the allowlist predicate if extractable. Route: delegated writer.

- [x] T4 — Type checking for JS: add `@types/node`, a `tsconfig` for `electron/` + `utils/dbSchema.js` with `checkJs`, and a `pnpm typecheck` script covering TS and JS; fix surfaced errors. Route: delegated writer.
- [x] T5 — Clean code limited to the DB/sync layer (`utils/db.ts`, `utils/db.native.ts`, `utils/dbMerge.ts`, `utils/sync.ts`, `electron/main.js`): remove duplication between adapters, split `electron/main.js` by responsibility, no behavior change. Route: delegated writer (user-scoped 2026-10-09: "limita").

## Acceptance criteria
- New tests pass; `pnpm exec tsc --noEmit` stays at 0 errors.
- Merge failures surface (logged/propagated) instead of advancing the marker.

## Checks
- `node --test` (or chosen runner) for new tests
- `pnpm exec tsc --noEmit`

## Commits
- Pending: user decision on how to handle pre-existing WIP in the same files before work-unit commits.

## Progress / Evidence
- Runner: `pnpm test` = `node --test tests/*.test.mjs` (Node 26 strips TS types natively, so tests import `utils/dbMerge.ts` directly; no new dependency). Tests are `.mjs` so `tsc` does not need `allowImportingTsExtensions`.
- T1: merge core extracted to `utils/dbMerge.ts` (`mergeSqlJsDatabases`), `utils/db.ts` delegates to it.
  - RED (before fix, extracted as-is): `merges every new or newer remote row...` failed with `1 !== 3` (only one `contact` row merged).
  - GREEN: statements freed once in a `finally` after the row loop; 3/3 merge tests pass.
- T2: `utils/db.native.ts` opens `uniqueTempDbName('contacts-merge')` in `cacheDirectory` (the exact written file; expo-sqlite parses `file://` via `toUri().path`, so no scheme stripping), deletes it via `deleteDatabaseSync` + `FileSystem.deleteAsync`. Open failure or all-tables failure throws on native, web (`dbMerge.ts`) and Electron (`db:mergeFromBase64` returns `{error}` -> renderer throws). `utils/sync.ts` unchanged: it only sets the watermark after `await mergeDatabaseFromBase64` resolves. Exception: no runnable test (needs device); checked by tsc + structural readback.
- T3: `electron/sqlPolicy.js` (`isAllowedExecSql`) adds exact-match `BEGIN [TRANSACTION]`, `COMMIT`, `END`, `ROLLBACK` (optional `;`); chained SQL stays blocked. 3 unit tests pass. No other renderer `execAsync` call is blocked on Electron (`dbInit` runs only in the browser path; Electron main initializes its own schema).
- Checks: `pnpm test`: 6/6 pass. `pnpm exec tsc --noEmit`: 0 errors. `node --check electron/main.js`: ok. `pnpm lint`: known broken (0 files), ignored.

- T4 (route: delegated writer, resumed after a rate-limit interruption): `@types/node` devDependency, `tsconfig.electron.json` (allowJs/checkJs/strict over `electron/**/*.js` + `utils/dbSchema.js`), script `typecheck` = `tsc --noEmit && tsc --noEmit -p tsconfig.electron.json`. 57 errors fixed with JSDoc types, casts on better-sqlite3 `.get()/.all()` rows, `requireDb()` for the nullable connection, `errorMessage/errorDetails` for `unknown` catches, `String(process.env.X)` in OAuth bodies (same serialized value as before). No `@ts-nocheck`, no `@ts-expect-error`, no compiler option relaxed. Exception: no RED/GREEN (type-only change); evidence is the typecheck going 57 -> 0.
- T5 (route: delegated writer, same session): shared rules in `utils/dbSchema.js` (`MERGE_TABLES`, `shouldTakeRemoteRow`, `mergeRemoteRows` with engine adapters, `computeSyncSignature`, `needsGenderMigration`, `genderMigrationStatements`). Adapters: `utils/dbMerge.ts` (sql.js), `utils/db.native.ts` (`expoSqliteMergeTarget`), `electron/database.js` (`betterSqliteMergeTarget`). `electron/main.js` split into `env.js`, `appProtocol.js`, `database.js`, `ipc.js`, `googleOAuth.js`, `tokenStore.js`, `window.js`, `errors.js`; main.js is the composition root. `electron-builder.json` `files` already packages `electron/**/*` and `utils/**/*`. Public exports of `utils/db.ts` / `utils/db.native.ts` unchanged. New tests: `tests/dbSchema.test.mjs` (7). Exception: no RED for a no-behavior-change refactor; existing merge tests stayed green throughout.
- Drift found and preserved (reported, not fixed):
  - Native merge does not toggle `foreign_keys` (expo-sqlite default, ON only after a gender migration ran in that session); web/Electron force OFF during merge. The schema has no `ON DELETE CASCADE`.
  - Native writes `contact` with `INSERT OR REPLACE` over a fixed column list (drops columns outside that list, e.g. any added later); web/Electron use `ON CONFLICT DO UPDATE` over all columns. Kept via `writeContact` override.
  - Electron gender migration rebuilds `contact` without `updated_at`; `utils/dbInit.ts` keeps it. Kept via `keepUpdatedAt: false`. `utils/dbInit.ts` was outside the allowed edit surface, so it still inlines its own copy of the migration SQL (follow-up: use `genderMigrationStatements({ keepUpdatedAt: true })`).
  - `migrationsSql` adds `updated_at` with `DEFAULT (datetime('now'))`; SQLite rejects non-constant defaults in `ALTER TABLE ADD COLUMN`, so on legacy DBs those migrations always fail silently (out of scope).
  - Electron per-table merge errors were `console.error(message)`; the shared rule logs `console.warn(error)` (log level only).
  - `contact_keyword` is in `SYNC_TABLES` but not in `MERGE_TABLES` (known, out of scope).
- Checks (T4+T5): `pnpm typecheck`: exit 0, 0 errors. `pnpm test`: 13/13 pass. `node --check` on all 11 `electron/*.js`: ok.
- Manual testing still needed: Electron desktop start, login (interactive + silent refresh), Drive push/pull merge, DB import/export, app:// asset serving; Android Drive pull merge.

## Next step
User decision on commits (see Commits); then native review per RDD.
