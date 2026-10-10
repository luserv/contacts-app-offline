'use strict';

const { app, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

/** @type {Record<string, string>} */
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

/** Must run before the app is ready. */
function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
  ]);
}

function getDistPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'dist')
    : path.join(__dirname, '..', 'dist');
}

/** @param {string} url */
function requestedFilePath(url) {
  const withoutScheme = url.replace('app://./', '').replace('app://', '');
  const withoutQueryOrHash = withoutScheme.split('?')[0].split('#')[0];
  return decodeURIComponent(withoutQueryOrHash);
}

/** @param {{ url: string }} request */
function serveDistFile(request) {
  const distPath = getDistPath();
  const filePath = requestedFilePath(request.url);
  const fullPath = path.join(distPath, filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const data = fs.readFileSync(fullPath);
    return new Response(data, { headers: { 'Content-Type': contentType } });
  }

  // Assets with an extension (fonts, images, ...) get a 404 instead of
  // index.html: the browser cannot parse HTML as a font and useFonts would hang.
  if (ext && ext !== '.html') {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  // SPA fallback: navigation routes without a physical file serve index.html.
  const indexData = fs.readFileSync(path.join(distPath, 'index.html'));
  return new Response(indexData, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/** Serves the exported web build (dist/) over app:// so absolute paths work. */
function handleAppProtocol() {
  protocol.handle('app', serveDistFile);
}

module.exports = { registerAppScheme, handleAppProtocol };
