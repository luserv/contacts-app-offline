'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Loads KEY=VALUE pairs from the packaged `.env` (resources) or the repo `.env`
 * into `process.env`, without overriding variables that are already set.
 * Dependency-free on purpose (no dotenv at runtime). Errors are ignored.
 */
function loadEnvFile() {
  try {
    const devPath = path.join(__dirname, '..', '.env');
    const prodPath = path.join(process.resourcesPath, '.env');
    const dotenvPath = fs.existsSync(prodPath) ? prodPath : devPath;
    if (!fs.existsSync(dotenvPath)) return;

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
  } catch (_) {}
}

module.exports = { loadEnvFile };
