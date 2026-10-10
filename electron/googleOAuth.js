'use strict';

const { BrowserWindow } = require('electron');
const { saveRefreshToken, getRefreshToken } = require('./tokenStore');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * @typedef {Object} OAuthTokens
 * @property {string | null} access_token
 * @property {string | null} id_token
 * @property {string | null} refresh_token
 */

/** @type {OAuthTokens} */
const NO_TOKENS = { access_token: null, id_token: null, refresh_token: null };

/** @param {Record<string, string>} fields */
function postTokenRequest(fields) {
  return fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: String(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
      client_secret: String(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET),
      ...fields,
    }),
  });
}

/**
 * Silent mode: exchanges the saved refresh token for an access token.
 * Returns empty tokens when there is no token or the refresh fails, so the
 * caller opens the interactive window (the user sees the consent screen).
 * @returns {Promise<OAuthTokens>}
 */
async function refreshSilently() {
  const savedRefreshToken = getRefreshToken();
  if (!savedRefreshToken) return NO_TOKENS;

  try {
    const tokenResponse = await postTokenRequest({
      refresh_token: savedRefreshToken,
      grant_type: 'refresh_token',
    });
    if (!tokenResponse.ok) return NO_TOKENS;

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) return NO_TOKENS;

    // The id_token comes from the tokeninfo endpoint.
    const idTokenResp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${tokens.access_token}`,
    );
    const idTokenInfo = idTokenResp.ok ? await idTokenResp.json() : {};
    return {
      access_token: tokens.access_token,
      id_token: idTokenInfo.id_token ?? null,
      refresh_token: savedRefreshToken,
    };
  } catch (_) {
    return NO_TOKENS;
  }
}

/**
 * Interactive mode: opens an auth window, captures the `?code=` redirect and
 * exchanges it for tokens (including a refresh token, which is persisted).
 * @param {string} authUrl
 * @param {string} redirectUri
 * @returns {Promise<OAuthTokens>}
 */
function authorizeInWindow(authUrl, redirectUri) {
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

      postTokenRequest({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
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
}

/**
 * Google OAuth for the desktop app (replaces Firebase signInWithPopup).
 * @param {{ authUrl: string, redirectUri: string, silent?: boolean }} params
 * @returns {Promise<OAuthTokens>}
 */
function googleOAuth({ authUrl, redirectUri, silent = false }) {
  return silent ? refreshSilently() : authorizeInWindow(authUrl, redirectUri);
}

module.exports = { googleOAuth };
