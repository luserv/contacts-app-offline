'use strict';

const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const { isAllowedExecSql } = require('./sqlPolicy');
const { errorMessage } = require('./errors');
const database = require('./database');
const { saveRefreshToken, getRefreshToken, clearRefreshToken } = require('./tokenStore');
const { googleOAuth } = require('./googleOAuth');

/**
 * Runs a file/DB operation and maps it to the `{ success } | { error }` shape
 * the renderer expects.
 * @param {() => void} operation
 */
function toResult(operation) {
  try {
    operation();
    return { success: true };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

// Birthdays are stored as DD/MM/YYYY.
function tomorrowBirthdatePrefix() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/`;
}

function registerFileHandlers() {
  ipcMain.handle('fs:readVcf', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import VCF Contacts',
      filters: [{ name: 'vCard', extensions: ['vcf', 'vcard'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8');
      return { content };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  });

  ipcMain.handle('fs:importDB', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Database',
      filters: [{ name: 'SQLite DB', extensions: ['db', 'sqlite', 'sqlite3'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    return toResult(() => database.replaceDatabaseFromFile(result.filePaths[0]));
  });

  ipcMain.handle('fs:exportDB', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Database',
      defaultPath: `contacts_backup_${Date.now()}.db`,
      filters: [{ name: 'SQLite DB', extensions: ['db'] }],
    });
    const filePath = result.filePath;
    if (result.canceled || !filePath) return { canceled: true };
    return toResult(() => database.createDatabaseSnapshot(filePath));
  });
}

function registerNotificationHandlers() {
  // Contacts whose birthday is tomorrow.
  ipcMain.handle('notif:checkBirthdays', () => {
    try {
      return database.requireDb().prepare(
        `SELECT first_name, surname, birthdate FROM contact WHERE birthdate LIKE ?`
      ).all(`${tomorrowBirthdatePrefix()}%`);
    } catch (_) { return []; }
  });
}

function registerDriveHandlers() {
  ipcMain.handle('db:readAsBase64', () => database.readDatabaseAsBase64());

  ipcMain.handle('db:writeFromBase64', (_event, base64) =>
    toResult(() => database.replaceDatabaseFromBuffer(Buffer.from(base64, 'base64'))));

  // Smart merge: imports rows whose remote updated_at is newer.
  ipcMain.handle('db:mergeFromBase64', (_event, base64) =>
    toResult(() => database.mergeDatabaseFromBase64(base64)));

  ipcMain.handle('db:signature', () => database.getDatabaseSignature());
}

function registerAuthHandlers() {
  ipcMain.handle('auth:saveRefreshToken', (_event, token) => {
    saveRefreshToken(token);
  });

  ipcMain.handle('auth:getRefreshToken', () => getRefreshToken());

  ipcMain.handle('auth:clearRefreshToken', () => {
    clearRefreshToken();
  });

  ipcMain.handle('auth:googleOAuth', (_event, params) => googleOAuth(params));
}

function registerDatabaseHandlers() {
  // Only PRAGMA, known DDL and transaction control via db:exec (see sqlPolicy.js).
  ipcMain.handle('db:exec', (_event, sql) => {
    if (!isAllowedExecSql(sql)) {
      console.error('[db:exec] Blocked unsafe SQL:', sql.substring(0, 100));
      throw new Error('Unsafe SQL blocked by security policy');
    }
    database.requireDb().exec(sql);
  });

  ipcMain.handle('db:run', (_event, sql, params) => {
    database.requireDb().prepare(sql).run(...(params || []));
  });

  ipcMain.handle('db:getAll', (_event, sql, params) =>
    database.requireDb().prepare(sql).all(...(params || [])));

  ipcMain.handle('db:getFirst', (_event, sql, params) =>
    database.requireDb().prepare(sql).get(...(params || [])) ?? null);
}

/** Registers every renderer-facing IPC channel exposed by preload.js. */
function registerIpcHandlers() {
  registerFileHandlers();
  registerNotificationHandlers();
  registerDriveHandlers();
  registerAuthHandlers();
  registerDatabaseHandlers();
}

module.exports = { registerIpcHandlers };
