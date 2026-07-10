import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth, db_firebase } from './firebase';
import { rcAddListener, rcConfigure, rcIsLicensed, rcLogOut } from './purchases';

const GUEST_KEY = 'auth_guest_mode';
const DRIVE_TOKEN_KEY = 'drive_access_token';
const DRIVE_TOKEN_EXPIRY_KEY = 'drive_token_expiry';
const ELECTRON_SIGNED_OUT_KEY = 'auth_electron_signed_out';
/** Margen: 55 min. Los tokens de Google duran 1 h; refrescamos antes de que expiren. */
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;

interface AuthState {
  user: User | null;
  isGuest: boolean;
  licensed: boolean;
  loading: boolean;
  driveToken: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  setDriveToken: (token: string | null) => void;
  refreshDriveToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isGuest: false,
  licensed: false,
  loading: true,
  driveToken: null,
  signIn: async () => {},
  signOutUser: async () => {},
  continueAsGuest: async () => {},
  setDriveToken: () => {},
  refreshDriveToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [licensed, setLicensed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driveToken, setDriveToken] = useState<string | null>(null);

  const checkLicense = useCallback(async (uid: string) => {
    try {
      if (Platform.OS === 'android') {
        // Android: RevenueCat es la fuente de verdad
        await rcConfigure(uid);
        const active = await rcIsLicensed();
        setLicensed(active);
        // Escucha cambios en tiempo real (ej. tras una compra)
        rcAddListener(setLicensed);
      } else {
        // Web/Electron: Firestore
        const snap = await getDoc(doc(db_firebase, 'licenses', uid));
        setLicensed(snap.exists() && snap.data()?.licensed === true);
      }
    } catch {
      setLicensed(false);
    }
  }, []);

  /** Guarda el token en estado y lo persiste en AsyncStorage con timestamp de expiración. */
  const persistDriveToken = useCallback(async (token: string | null) => {
    setDriveToken(token);
    if (token) {
      const expiry = String(Date.now() + TOKEN_LIFETIME_MS);
      await AsyncStorage.setItem(DRIVE_TOKEN_KEY, token);
      await AsyncStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, expiry);
    } else {
      await AsyncStorage.removeItem(DRIVE_TOKEN_KEY);
      await AsyncStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
    }
  }, []);

  const buildGoogleOAuthUrl = useCallback((prompt?: 'none') => {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
    const redirectUri = 'http://localhost';
    const scopes = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.file'].join(' ');
    const nonce = Math.random().toString(36).substring(2);
    const promptQuery = prompt ? `&prompt=${prompt}` : '';

    return (
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&include_granted_scopes=true` +
      `&access_type=offline` +
      `&nonce=${nonce}` +
      promptQuery
    );
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_KEY);
        await checkLicense(u.uid);

        if (Platform.OS === 'android') {
          try {
            const { GoogleSignin } = require('@react-native-google-signin/google-signin');
            const tokens = await GoogleSignin.getTokens();
            await persistDriveToken(tokens.accessToken);
          } catch {}
        } else {
          try {
            const stored = await AsyncStorage.getItem(DRIVE_TOKEN_KEY);
            const expiry = await AsyncStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY);
            if (stored && expiry && Date.now() < Number(expiry)) {
              setDriveToken(stored);
            }
          } catch {}
        }
      } else {
        setLicensed(false);
        const guest = await AsyncStorage.getItem(GUEST_KEY);
        if (guest === 'true') {
          setIsGuest(true);
        } else {
          const isElectron = typeof window !== 'undefined' && !!(window as any).electronAuth;
          if (isElectron) {
            try {
              const signedOutFlag = await AsyncStorage.getItem(ELECTRON_SIGNED_OUT_KEY);
              if (signedOutFlag !== 'true') {
                const authUrl = buildGoogleOAuthUrl('none');
                const redirectUri = 'http://localhost';
                const { access_token, id_token } = await (window as any).electronAuth.googleOAuth({
                  authUrl,
                  redirectUri,
                  silent: true,
                });
                if (access_token && id_token) {
                  const credential = GoogleAuthProvider.credential(id_token, access_token);
                  await signInWithCredential(auth, credential);
                  await persistDriveToken(access_token);
                  await AsyncStorage.removeItem(ELECTRON_SIGNED_OUT_KEY);
                }
              }
            } catch {}
          }
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [checkLicense, persistDriveToken]);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    if (Platform.OS === 'web') {
      // Electron: flujo OAuth propio con BrowserWindow (signInWithPopup no funciona en Electron)
      const isElectron = typeof window !== 'undefined' && !!(window as any).electronFS;
      if (isElectron) {
        const redirectUri = 'http://localhost';
        const authUrl = buildGoogleOAuthUrl();
        const electronAuth = (window as any).electronAuth;
        if (!electronAuth) throw new Error('Restart the application to apply changes.');
        const { access_token, id_token, refresh_token } = await electronAuth.googleOAuth({ authUrl, redirectUri });
        if (!access_token || !id_token) throw new Error('No se complet\u00f3 la autenticaci\u00f3n con Google');
        const credential = GoogleAuthProvider.credential(id_token, access_token);
        await signInWithCredential(auth, credential);
        await persistDriveToken(access_token);
        if (refresh_token) await electronAuth.saveRefreshToken(refresh_token);
        await AsyncStorage.removeItem(ELECTRON_SIGNED_OUT_KEY);
        return;
      }
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) await persistDriveToken(credential.accessToken);
      return;
    }

    // Android: OAuth se maneja desde login.native.tsx via expo-auth-session
    throw new Error('USE_EXPO_AUTH');
  }, [buildGoogleOAuthUrl, persistDriveToken]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setIsGuest(false);
    setLicensed(false);
    await rcLogOut();
    await persistDriveToken(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).electronAuth) {
      await (window as any).electronAuth.clearRefreshToken();
      await AsyncStorage.setItem(ELECTRON_SIGNED_OUT_KEY, 'true');
    }
    await AsyncStorage.removeItem(GUEST_KEY);
  }, [persistDriveToken]);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, 'true');
    setIsGuest(true);
  }, []);

  /**
   * Refresca el Drive access token sin interacción del usuario cuando es posible.
   * - Android: GoogleSignin maneja el refresh automáticamente.
   * - Electron: primero revisa el token persistido; si expiró, intenta re-auth
   *   silenciosa (prompt=none). Si Google requiere interacción, retorna null
   *   para que el caller muestre el diálogo de sign-in.
   */
  const refreshDriveToken = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'android') {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        const tokens = await GoogleSignin.getTokens();
        await persistDriveToken(tokens.accessToken);
        return tokens.accessToken;
      } catch {
        return null;
      }
    }

    // Electron / web
    if (typeof window !== 'undefined' && (window as any).electronAuth) {
      // 1. Chequear token persistido antes de ir a la red
      try {
        const stored = await AsyncStorage.getItem(DRIVE_TOKEN_KEY);
        const expiry = await AsyncStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY);
        if (stored && expiry && Date.now() < Number(expiry)) {
          setDriveToken(stored);
          return stored;
        }
      } catch {}

      // 2. Re-auth silenciosa: intenta refresh token en el main process.
      //    Si el refresh falla o no hay token guardado, retorna null.
      try {
        const redirectUri = 'http://localhost';
        const authUrl = buildGoogleOAuthUrl('none'); // sin UI; falla si requiere interacción
        const { access_token, id_token } = await (window as any).electronAuth.googleOAuth({
          authUrl,
          redirectUri,
          silent: true,
        });
        if (access_token && id_token) {
          const credential = GoogleAuthProvider.credential(id_token, access_token);
          await signInWithCredential(auth, credential);
          await persistDriveToken(access_token);
          return access_token;
        }
      } catch {
        // prompt=none falló (sesión expirada, requiere interacción) → caller muestra UI
      }
    }

    return null;
  }, [buildGoogleOAuthUrl, persistDriveToken]);

  return (
    <AuthContext.Provider value={{ user, isGuest, licensed, loading, driveToken, signIn, signOutUser, continueAsGuest, setDriveToken, refreshDriveToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
