import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth, db_firebase } from './firebase';

const GUEST_KEY = 'auth_guest_mode';

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
      const snap = await getDoc(doc(db_firebase, 'licenses', uid));
      setLicensed(snap.exists() && snap.data()?.licensed === true);
    } catch {
      setLicensed(false);
    }
  }, []);

  useEffect(() => {
    // Capturar resultado del redirect de Google (solo en web)
    if (Platform.OS === 'web') {
      getRedirectResult(auth).then(result => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) setDriveToken(credential.accessToken);
        }
      }).catch(() => {});
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_KEY);
        await checkLicense(u.uid);
        // Android: obtener token de Drive al iniciar si ya hay sesión
        if (Platform.OS === 'android') {
          try {
            const { GoogleSignin } = require('@react-native-google-signin/google-signin');
            const tokens = await GoogleSignin.getTokens();
            setDriveToken(tokens.accessToken);
          } catch {}
        }
      } else {
        setLicensed(false);
        // Restaurar modo invitado si estaba activo
        const guest = await AsyncStorage.getItem(GUEST_KEY);
        if (guest === 'true') setIsGuest(true);
      }
      setLoading(false);
    });
    return unsub;
  }, [checkLicense]);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    if (Platform.OS === 'web') {
      // Electron: flujo OAuth propio con BrowserWindow (signInWithPopup no funciona en Electron)
      const isElectron = typeof window !== 'undefined' && !!(window as any).electronFS;
      if (isElectron) {
        const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
        const redirectUri = 'http://localhost';
        const scopes = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.file'].join(' ');
        const nonce = Math.random().toString(36).substring(2);
        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth` +
          `?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token%20id_token` +
          `&scope=${encodeURIComponent(scopes)}` +
          `&nonce=${nonce}`;
        const electronAuth = (window as any).electronAuth;
        if (!electronAuth) throw new Error('Reiniciá la aplicación para aplicar los cambios.');
        const { access_token, id_token } = await electronAuth.googleOAuth({ authUrl, redirectUri });
        const credential = GoogleAuthProvider.credential(id_token, access_token);
        await signInWithCredential(auth, credential);
        setDriveToken(access_token);
        return;
      }
      await signInWithRedirect(auth, provider);
      return;
    }

    // Android: OAuth se maneja desde login.native.tsx via expo-auth-session
    throw new Error('USE_EXPO_AUTH');
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setIsGuest(false);
    setDriveToken(null);
    await AsyncStorage.removeItem(GUEST_KEY);
  }, []);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, 'true');
    setIsGuest(true);
  }, []);

  /** En Android, refresca el Drive access token usando GoogleSignin (maneja refresh automático). */
  const refreshDriveToken = useCallback(async (): Promise<string | null> => {
    if (Platform.OS !== 'android') return null;
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const tokens = await GoogleSignin.getTokens();
      setDriveToken(tokens.accessToken);
      return tokens.accessToken;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isGuest, licensed, loading, driveToken, signIn, signOutUser, continueAsGuest, setDriveToken, refreshDriveToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
