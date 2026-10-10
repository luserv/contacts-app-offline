'use strict';

const { app, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

// Google refresh token, encrypted with safeStorage when the OS supports it.
const refreshTokenPath = path.join(app.getPath('userData'), 'google_refresh_token.json');

/** @param {string} token */
function saveRefreshToken(token) {
  try {
    const data = JSON.stringify({ token });
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(data);
      fs.writeFileSync(refreshTokenPath, encrypted.toString('base64'), 'utf8');
    } else {
      fs.writeFileSync(refreshTokenPath, data, 'utf8');
    }
  } catch (_) {}
}

/** @returns {string | null} */
function getRefreshToken() {
  try {
    if (fs.existsSync(refreshTokenPath)) {
      const raw = fs.readFileSync(refreshTokenPath, 'utf8');
      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(Buffer.from(raw, 'base64'));
        return JSON.parse(decrypted).token;
      }
      return JSON.parse(raw).token;
    }
  } catch (_) {}
  return null;
}

function clearRefreshToken() {
  try { if (fs.existsSync(refreshTokenPath)) fs.unlinkSync(refreshTokenPath); } catch (_) {}
}

module.exports = { saveRefreshToken, getRefreshToken, clearRefreshToken };
