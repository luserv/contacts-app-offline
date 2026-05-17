import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDn7mY4PTcZVjVX5tZ8a-Oy5vcewxt5D7o",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "c0ntacts.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "c0ntacts",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "c0ntacts.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "461026464928",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:461026464928:web:44b80777c8faf7ceb265c5",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

function createAuth() {
  // Si ya fue inicializado (hot reload), reusar
  try {
    if (Platform.OS === 'web') {
      return initializeAuth(app, { persistence: browserLocalPersistence });
    } else {
      const { getReactNativePersistence } = require('firebase/auth');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    }
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db_firebase = getFirestore(app);
