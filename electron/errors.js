'use strict';

/**
 * Short message for IPC `{ error }` results.
 * @param {unknown} e
 * @returns {string}
 */
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Stack (or message) for fatal error dialogs.
 * @param {unknown} e
 * @returns {string}
 */
function errorDetails(e) {
  return e instanceof Error ? (e.stack || e.message) : String(e);
}

module.exports = { errorMessage, errorDetails };
