# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Start Expo dev server (then press 'a' for Android, 'w' for web)
pnpm start

# Run directly on Android
pnpm android

# Lint
pnpm lint

# Seed local DB with test data
pnpm run sqlite:seed

# Electron (desktop)
pnpm run electron:rebuild   # first time only, or after Node/Electron version change
pnpm run electron:dev       # start in dev mode

# EAS production builds
pnpm run build:prod         # Android (requires Expo account)
pnpm run electron:linux     # Linux .AppImage
```

There is no test suite.

## Architecture

**Multi-target Expo app**: Android, Web, and Electron (desktop). All three targets share the same React Native codebase via `react-native-web` and `expo-router`.

### Platform-specific SQLite adapters

The DB layer uses Metro's platform resolution to swap implementations:

- `utils/db.native.ts` — Android/iOS: uses `expo-sqlite` (sync API wrapped in Promises). DB initializes at module load time.
- `utils/db.ts` — Web/Electron, with two runtime branches:
  - **Electron**: delegates all SQL to the main process via `window.electronDB` (exposed by `electron/preload.js` through `contextBridge`).
  - **Browser**: runs `sql.js` (SQLite compiled to WASM) entirely in-memory, persisting the serialized DB to IndexedDB. The WASM binary is loaded from `public/sql-wasm.wasm`, which the `postinstall` script copies out of `node_modules/sql.js`. The `public/` dir is gitignored, so `pnpm install` must run before a web/Electron build.
- `utils/dbInit.ts` — shared schema bootstrap (`initializeDatabase`) used by every adapter; pulls `createTablesSql` / `migrationsSql` / `seedSql` from `dbSchema.js`.
- `electron/main.js` — opens `better-sqlite3` in the main process, handles IPC from the renderer, stores DB at `app.getPath('userData')/contacts.db`.

All adapters expose the same interface: `db.getAllAsync`, `db.getFirstAsync`, `db.runAsync`, `db.execAsync`.

### State management

Three React Context providers wrap the app in `app/_layout.tsx`:

1. `I18nProvider` (`utils/i18n.tsx`) — ES/EN translations, persisted in SecureStore (native) or localStorage (web).
2. `AuthProvider` (`utils/authContext.tsx`) — Firebase Google Auth (optional). Supports guest mode; guards routes via `AuthGate` in `_layout.tsx`. Manages Drive OAuth tokens.
3. `ContactsProvider` (`utils/context.tsx`) — holds `contacts[]` state; exposes all CRUD actions via `useContacts()`.

### Contacts actions

`utils/contactsActions.ts` composes four factory modules (each returns a slice of the actions object) into the value exposed by `useContacts()`:
- `contactsActions.core.ts` — create, read, update, delete contacts
- `contactsActions.channels.ts` — phones, emails, URLs
- `contactsActions.records.ts` — bank accounts, identity documents
- `contactsActions.relationships.ts` — inter-contact relationships

Shared helpers live in `contactsActionsShared.ts`; types in `contactsTypes.ts`.

### Other domain utilities

- `driveSync.ts` — Google Drive backup/restore (`drive.file` scope only).
- `vcfImport.ts` — VCF/vCard import.
- `cedulaFilter.ts` / `organizationFilter.ts` / `contactList.ts` — search and filter logic for the list screen (e.g. `age:>18`, `&` intersection).
- `notifications.ts` / `notificationSettings.ts` — birthday notification scheduling.

### Routing (Expo Router)

```
app/
  _layout.tsx          # root layout: providers + AuthGate + Stack navigator
  login.tsx            # web login
  login.native.tsx     # native login (Metro picks .native.tsx on Android)
  (tabs)/
    _layout.tsx        # bottom tab navigator
    index.tsx          # contacts list with search/filter
    calendar.tsx       # birthday calendar
    sync.tsx           # Google Drive backup/restore
    config.tsx         # settings
    notifications.tsx
    menu.tsx
  contact/
    [id].tsx           # contact detail
```

### Database schema

Defined in `utils/dbSchema.js` (shared by mobile init and Electron main process). Migrations are additive `ALTER TABLE` statements in `migrationsSql[]` — they must be idempotent (silent-fail if already applied).

### Components

`components/contact/` holds all contact-detail UI cards (phones, emails, bank accounts, documents, organizations, relationships, notes, URLs). `components/AdBanner.tsx` / `AdBanner.web.tsx` is a platform-split AdMob component.

### Environment variables

Copy `.env.example` to `.env`. Google OAuth and AdMob keys are optional — the app runs in basic mode without them. `EXPO_PUBLIC_*` variables are inlined at build time by Expo.

### Login

On Android, `login.native.tsx` is resolved (Metro `.native` suffix). On web/Electron, `login.tsx` is used. Both authenticate via Firebase; guest mode skips auth entirely.

## Product / design constraints

`PRODUCT.md` defines the product's design guardrails (in Spanish) — read it before UI work. Key intent: a private, offline-first contacts manager that should feel native (OS-like, not "branded"), let dense data be the protagonist, and avoid CRM/social-network UI patterns. Target WCAG AA (≥44pt touch targets, adequate contrast).
