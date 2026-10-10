// Electron main process — composition root.
// Responsibilities live in sibling modules:
//   env.js          .env loading
//   appProtocol.js  app:// protocol serving the exported web build (dist/)
//   database.js     better-sqlite3 connection, schema bootstrap, Drive merge
//   ipc.js          renderer-facing IPC channels (see preload.js)
//   googleOAuth.js  Google OAuth window / refresh flow
//   tokenStore.js   encrypted refresh-token storage
//   window.js       main BrowserWindow
const { app, BrowserWindow, dialog } = require('electron');
const { loadEnvFile } = require('./env');

// Load environment variables before any module reads process.env.
loadEnvFile();

const { registerAppScheme, handleAppProtocol } = require('./appProtocol');
const { initDB } = require('./database');
const { registerIpcHandlers } = require('./ipc');
const { createWindow } = require('./window');
const { errorDetails } = require('./errors');

// The scheme must be registered before the app is ready.
registerAppScheme();
registerIpcHandlers();

process.on('uncaughtException', (err) => {
  dialog.showErrorBox('Error starting Contacts', errorDetails(err));
  app.quit();
});

app.whenReady().then(() => {
  handleAppProtocol();

  try {
    initDB();
  } catch (err) {
    dialog.showErrorBox('Error initializing database', errorDetails(err));
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  dialog.showErrorBox('Error starting Contacts', errorDetails(err));
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
