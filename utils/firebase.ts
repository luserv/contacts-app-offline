import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDn7mY4PTcZVjVX5tZ8a-Oy5vcewxt5D7o",
  authDomain: "c0ntacts.firebaseapp.com",
  projectId: "c0ntacts",
  storageBucket: "c0ntacts.firebasestorage.app",
  messagingSenderId: "461026464928",
  appId: "1:461026464928:web:44b80777c8faf7ceb265c5",
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
