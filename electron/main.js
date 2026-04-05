const { app, BrowserWindow, ipcMain, protocol, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { createTablesSql, migrationsSql, seedSql } = require('../utils/dbSchema');

// Registrar el protocolo antes de que la app esté lista
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

// Obtener ruta de datos del usuario (persiste entre actualizaciones)
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'contacts.db');

let db = null;

function initDB() {
  // En producción, better-sqlite3 está fuera del asar (asarUnpack)
  const bsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3')
    : 'better-sqlite3';
  const Database = require(bsPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(createTablesSql);

  for (const sql of migrationsSql) {
    try { db.exec(sql); } catch (_) {}
  }

  // Migración: normalizar gender a mayúsculas y actualizar CHECK constraint
  try {
    const schemaRow = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='contact'"
    ).get();
    if (schemaRow && schemaRow.sql && schemaRow.sql.includes("'male'")) {
      db.pragma('foreign_keys = OFF');
      db.exec('DROP TABLE IF EXISTS contact_gender_tmp');
      db.exec(`CREATE TABLE contact_gender_tmp (
        contact_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        surname TEXT NOT NULL,
        birthdate TEXT,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE')),
        status_id TEXT,
        FOREIGN KEY (status_id) REFERENCES marital_status (status_id)
      )`);
      db.exec(
        `INSERT INTO contact_gender_tmp
         SELECT contact_id, first_name, middle_name, surname, birthdate, UPPER(gender), status_id
         FROM contact`
      );
      db.exec('DROP TABLE contact');
      db.exec('ALTER TABLE contact_gender_tmp RENAME TO contact');
      db.pragma('foreign_keys = ON');
    }
  } catch (_) {
    try { db.pragma('foreign_keys = ON'); } catch (_) {}
  }

  db.exec(seedSql);
}

// Manejadores IPC — importar VCF
ipcMain.handle('fs:readVcf', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Importar contactos VCF',
    filters: [{ name: 'vCard', extensions: ['vcf', 'vcard'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { content };
  } catch (e) {
    return { error: e.message };
  }
});

// Manejadores IPC — notificaciones
ipcMain.handle('notif:checkBirthdays', () => {
  // Devuelve contactos cuyo cumpleaños es mañana (DD/MM/AAAA)
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const prefix = `${day}/${month}/`;
    const rows = db.prepare(
      `SELECT first_name, surname, birthdate FROM contact WHERE birthdate LIKE ?`
    ).all(`${prefix}%`);
    return rows;
  } catch (_) { return []; }
});

// Manejadores IPC — archivo (import/export DB)
ipcMain.handle('fs:importDB', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Importar base de datos',
    filters: [{ name: 'SQLite DB', extensions: ['db', 'sqlite', 'sqlite3'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  try {
    fs.copyFileSync(result.filePaths[0], dbPath);
    // Reabrir la conexión con el nuevo archivo
    db.close();
    initDB();
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('fs:exportDB', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Exportar base de datos',
    defaultPath: `contacts_backup_${Date.now()}.db`,
    filters: [{ name: 'SQLite DB', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    // Hacer checkpoint WAL antes de copiar
    db.pragma('wal_checkpoint(FULL)');
    fs.copyFileSync(dbPath, result.filePath);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

// Manejadores IPC — backup Drive (base64)
ipcMain.handle('db:readAsBase64', () => {
  db.pragma('wal_checkpoint(FULL)');
  return fs.readFileSync(dbPath).toString('base64');
});

ipcMain.handle('db:writeFromBase64', (_event, base64) => {
  try {
    const buffer = Buffer.from(base64, 'base64');
    db.close();
    fs.writeFileSync(dbPath, buffer);
    initDB();
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

// ── IPC: Google OAuth (reemplaza signInWithPopup de Firebase) ─────────────────

ipcMain.handle('auth:googleOAuth', (_event, { authUrl, redirectUri }) => {
  return new Promise((resolve, reject) => {
    let handled = false;

    const authWindow = new BrowserWindow({
      width: 500,
      height: 650,
      alwaysOnTop: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    authWindow.loadURL(authUrl);

    authWindow.webContents.on('will-redirect', (event, redirectUrl) => {
      if (!redirectUrl.startsWith(redirectUri) || handled) return;
      handled = true;
      event.preventDefault();
      authWindow.destroy();

      const hash = redirectUrl.includes('#') ? redirectUrl.split('#')[1] : '';
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const id_token = params.get('id_token');

      if (access_token && id_token) {
        resolve({ access_token, id_token });
      } else {
        reject(new Error(params.get('error') || 'No se recibieron los tokens de Google'));
      }
    });

    authWindow.on('closed', () => {
      if (!handled) reject(new Error('Autenticación cancelada'));
    });
  });
});

// Manejadores IPC — base de datos
ipcMain.handle('db:exec', (_event, sql) => {
  db.exec(sql);
});

ipcMain.handle('db:run', (_event, sql, params) => {
  const stmt = db.prepare(sql);
  stmt.run(...(params || []));
});

ipcMain.handle('db:getAll', (_event, sql, params) => {
  const stmt = db.prepare(sql);
  return stmt.all(...(params || []));
});

ipcMain.handle('db:getFirst', (_event, sql, params) => {
  const stmt = db.prepare(sql);
  return stmt.get(...(params || [])) ?? null;
});

function getDistPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist')
    : path.join(__dirname, '..', 'dist');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 800,
    icon: path.join(__dirname, '../assets/images/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Permitir popups de OAuth (Firebase signInWithPopup)
  win.webContents.setWindowOpenHandler(({ url }) => {
    const isOAuth =
      url.includes('accounts.google.com') ||
      url.includes('firebaseapp.com/__/auth');
    if (isOAuth) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: false, // necesario para window.opener.postMessage
          },
        },
      };
    }
    return { action: 'deny' };
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:8081');
    win.webContents.openDevTools();
  } else {
    // Usar protocolo personalizado para que las rutas absolutas funcionen
    win.loadURL('app://./');
  }
}

process.on('uncaughtException', (err) => {
  const { dialog } = require('electron');
  dialog.showErrorBox('Error al iniciar Contacts', err.stack || err.message);
  app.quit();
});

app.whenReady().then(() => {
  // Protocolo app:// sirve archivos desde la carpeta dist
  protocol.handle('app', (request) => {
    const distPath = getDistPath();
    let filePath = request.url.replace('app://./', '').replace('app://', '');

    // Quitar query string y hash
    filePath = filePath.split('?')[0].split('#')[0];

    // Decodificar URI
    filePath = decodeURIComponent(filePath);

    const fullPath = path.join(distPath, filePath);

    // Si el archivo existe, servirlo; si no, servir index.html (SPA fallback)
    const targetPath = fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
      ? fullPath
      : path.join(distPath, 'index.html');

    return net.fetch(url.pathToFileURL(targetPath).toString());
  });

  try {
    initDB();
  } catch (err) {
    dialog.showErrorBox('Error al iniciar la base de datos', err.stack || err.message);
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  dialog.showErrorBox('Error al iniciar Contacts', err.stack || err.message);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
