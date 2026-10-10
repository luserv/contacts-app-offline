'use strict';

const { BrowserWindow } = require('electron');
const path = require('path');

/** @param {string} url */
function isOAuthPopupUrl(url) {
  return url.includes('accounts.google.com') || url.includes('firebaseapp.com/__/auth');
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

  // Allow OAuth popups (Firebase signInWithPopup); deny everything else.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isOAuthPopupUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: false, // required for window.opener.postMessage
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
    // Custom protocol so absolute asset paths resolve against dist/.
    win.loadURL('app://./');
  }
}

module.exports = { createWindow };
