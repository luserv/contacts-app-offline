// Android: usa @react-native-google-signin/google-signin (SDK nativo, no requiere redirect URI)
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../utils/firebase';
import { useAuth } from '../utils/authContext';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
  offlineAccess: true,
});

export default function LoginScreen() {
  const { user, isGuest, loading, continueAsGuest, setDriveToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!loading && (user || isGuest)) router.replace('/');
  }, [user, isGuest, loading]);

  const handleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('No se recibió el token de Google.');
      const tokens = await GoogleSignin.getTokens();
      const credential = GoogleAuthProvider.credential(idToken, tokens.accessToken);
      await signInWithCredential(auth, credential);
      setDriveToken(tokens.accessToken);
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        // usuario canceló, no mostrar error
      } else if (e.code === statusCodes.IN_PROGRESS) {
        // ya hay un sign-in en curso
      } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services no disponible.');
      } else {
        setError(e.message ?? 'Error al iniciar sesión');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    await continueAsGuest();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>👥</Text>
        </View>
        <Text style={styles.title}>Contacts</Text>
        <Text style={styles.subtitle}>Tu agenda personal, siempre contigo.</Text>
        <Pressable style={[styles.googleBtn, busy && styles.btnDisabled]} onPress={handleSignIn} disabled={busy}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.googleBtnText}>🔑 Continuar con Google</Text>}
        </Pressable>
        <Text style={styles.googleHint}>Activa el backup automático en Google Drive</Text>
        <Pressable style={styles.guestBtn} onPress={handleGuest}>
          <Text style={styles.guestBtnText}>Continuar sin iniciar sesión</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.disclaimer}>Al iniciar sesión aceptas que tus datos de licencia se almacenen de forma segura.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 380, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  iconPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E5F0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconText: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#000', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', marginBottom: 32 },
  googleBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, width: '100%', alignItems: 'center', marginBottom: 6 },
  btnDisabled: { opacity: 0.6 },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleHint: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginBottom: 16 },
  guestBtn: { width: '100%', alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  guestBtnText: { color: '#007AFF', fontSize: 15, fontWeight: '500' },
  error: { color: '#FF3B30', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  disclaimer: { fontSize: 12, color: '#C7C7CC', textAlign: 'center', marginTop: 8 },
});
