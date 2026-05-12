const { app, BrowserWindow, ipcMain, protocol, net, dialog } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde .env (sin depender de dotenv)
// En producción el .env se copia a resourcesPath via extraResources
try {
  const devPath = path.join(__dirname, '..', '.env');
  const prodPath = path.join(process.resourcesPath, '.env');
  const dotenvPath = fs.existsSync(prodPath) ? prodPath : devPath;
  if (fs.existsSync(dotenvPath)) {
    const lines = fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  }
} catch (_) {}

const { createTablesSql, migrationsSql, seedSql } = require('../utils/dbSchema');

// Registrar el protocolo antes de que la app esté lista
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

// Obtener ruta de datos del usuario (persiste entre actualizaciones)
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'contacts.db');
const dbWalPath = `${dbPath}-wal`;
const dbShmPath = `${dbPath}-shm`;
const refreshTokenPath = path.join(userDataPath, 'google_refresh_token.json');

let db = null;

function saveRefreshToken(token) {
  try { fs.writeFileSync(refreshTokenPath, JSON.stringify({ token }), 'utf8'); } catch (_) {}
}

function getRefreshToken() {
  try {
    if (fs.existsSync(refreshTokenPath)) {
      const raw = fs.readFileSync(refreshTokenPath, 'utf8');
      return JSON.parse(raw).token;
    }
  } catch (_) {}
  return null;
}

function clearRefreshToken() {
  try { if (fs.existsSync(refreshTokenPath)) fs.unlinkSync(refreshTokenPath); } catch (_) {}
}

function removeIfExists(targetPath) {
  try {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  } catch (_) {}
}

function closeDbConnection() {
  if (!db) return;
  try { db.pragma('wal_checkpoint(FULL)'); } catch (_) {}
  try { db.close(); } catch (_) {}
  db = null;
}

function replaceDatabaseFromBuffer(buffer) {
  closeDbConnection();
  removeIfExists(dbWalPath);
  removeIfExists(dbShmPath);
  removeIfExists(dbPath);
  fs.writeFileSync(dbPath, buffer);
  initDB();
}

function replaceDatabaseFromFile(sourcePath) {
  closeDbConnection();
  removeIfExists(dbWalPath);
  removeIfExists(dbShmPath);
  removeIfExists(dbPath);
  fs.copyFileSync(sourcePath, dbPath);
  initDB();
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createDatabaseSnapshot(snapshotPath) {
  removeIfExists(snapshotPath);
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.exec(`VACUUM INTO ${sqlString(snapshotPath)}`);
}

function initDB() {
  // Asegurar que el directorio de datos existe
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

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
    title: 'Import VCF Contacts',
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
    title: 'Import Database',
    filters: [{ name: 'SQLite DB', extensions: ['db', 'sqlite', 'sqlite3'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  try {
    replaceDatabaseFromFile(result.filePaths[0]);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('fs:exportDB', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Export Database',
    defaultPath: `contacts_backup_${Date.now()}.db`,
    filters: [{ name: 'SQLite DB', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    createDatabaseSnapshot(result.filePath);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

// Manejadores IPC — backup Drive (base64)
ipcMain.handle('db:readAsBase64', () => {
  const snapshotPath = path.join(os.tmpdir(), `contacts-drive-${Date.now()}.db`);
  try {
    createDatabaseSnapshot(snapshotPath);
    return fs.readFileSync(snapshotPath).toString('base64');
  } finally {
    removeIfExists(snapshotPath);
  }
});

ipcMain.handle('db:writeFromBase64', (_event, base64) => {
  try {
    const buffer = Buffer.from(base64, 'base64');
    replaceDatabaseFromBuffer(buffer);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('auth:saveRefreshToken', (_event, token) => {
  saveRefreshToken(token);
});

ipcMain.handle('auth:getRefreshToken', () => {
  return getRefreshToken();
});

ipcMain.handle('auth:clearRefreshToken', () => {
  clearRefreshToken();
});

// ── IPC: Google OAuth (reemplaza signInWithPopup de Firebase) ─────────────────

ipcMain.handle('auth:googleOAuth', async (_event, { authUrl, redirectUri, silent = false }) => {
  // ── Modo silencioso: usar refresh token para obtener access token ──────────
  if (silent) {
    const savedRefreshToken = getRefreshToken();
    if (savedRefreshToken) {
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            client_secret: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET,
            refresh_token: savedRefreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (tokenResponse.ok) {
          const tokens = await tokenResponse.json();
          if (tokens.access_token) {
            // Obtener id_token via tokeninfo endpoint
            const idTokenResp = await fetch(
              `https://oauth2.googleapis.com/tokeninfo?access_token=${tokens.access_token}`,
            );
            const idTokenInfo = idTokenResp.ok ? await idTokenResp.json() : {};
            return {
              access_token: tokens.access_token,
              id_token: idTokenInfo.id_token ?? null,
              refresh_token: savedRefreshToken,
            };
          }
        }
      } catch (_) {}
    }
    // Si falla el refresh o no hay token, retorna null para que el caller
    // abra la ventana normal (el usuario verá la pantalla de consentimiento)
    return { access_token: null, id_token: null, refresh_token: null };
  }

  // ── Flujo normal: abrir ventana para que el usuario autorice ────────────────
  return new Promise((resolve, reject) => {
    let handled = false;

    const authWindow = new BrowserWindow({
      width: 500,
      height: 650,
      show: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    authWindow.loadURL(authUrl);

    authWindow.webContents.on('will-redirect', (event, redirectUrl) => {
      if (!redirectUrl.startsWith(redirectUri) || handled) return;
      handled = true;
      event.preventDefault();
      authWindow.destroy();

      // Flujo con código: extraer ?code= de la query string
      const urlObj = new URL(redirectUrl);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (error) {
        reject(new Error(error));
        return;
      }

      if (!code) {
        reject(new Error('Authorization code not received'));
        return;
      }

      // Intercambiar código por tokens (incluye refresh_token)
      fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          client_secret: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
        .then(resp => resp.json())
        .then(tokens => {
          if (tokens.access_token && tokens.id_token) {
            saveRefreshToken(tokens.refresh_token ?? '');
            resolve({
              access_token: tokens.access_token,
              id_token: tokens.id_token,
              refresh_token: tokens.refresh_token ?? null,
            });
          } else {
            reject(new Error(tokens.error_description || 'Error exchanging code for tokens'));
          }
        })
        .catch(reject);
    });

    authWindow.on('closed', () => {
      if (!handled) {
        handled = true;
        reject(new Error('Authentication cancelled'));
      }
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
  dialog.showErrorBox('Error starting Contacts', err.stack || err.message);
  app.quit();
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map':  'application/json',
  '.wasm': 'application/wasm',
};

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

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Leer el archivo directamente (funciona dentro del asar) para poder
    // establecer el Content-Type correcto. net.fetch con file:// no garantiza
    // el MIME type, lo que hace que Electron rechace cargar fuentes (.ttf).
    const data = fs.readFileSync(targetPath);
    return new Response(data, { headers: { 'Content-Type': contentType } });
  });

  try {
    initDB();
  } catch (err) {
    dialog.showErrorBox('Error initializing database', err.stack || err.message);
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  dialog.showErrorBox('Error starting Contacts', err.stack || err.message);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
