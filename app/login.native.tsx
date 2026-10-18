// Android: usa @react-native-google-signin/google-signin (SDK nativo, no requiere redirect URI)
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../utils/firebase';
import { useAuth } from '../utils/authContext';
import { useTheme } from '../utils/theme';
import { useI18n } from '../utils/i18n';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

GoogleSignin.configure({
  ...(WEB_CLIENT_ID ? { webClientId: WEB_CLIENT_ID, offlineAccess: true } : {}),
  scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
});

export default function LoginScreen() {
  const { t } = useI18n();
  const { user, isGuest, loading, continueAsGuest, setDriveToken } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
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
      if (!idToken) throw new Error('Google token not received.');
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
        setError(t.login.playServicesError);
      } else {
        setError(e.message ?? t.login.signInError);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    await continueAsGuest();
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.accent }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacityMedium }]}>
        <View style={[styles.iconPlaceholder, { backgroundColor: colors.accentSubtle }]}>
          <Text style={styles.iconText}>👥</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t.login.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.login.subtitle}</Text>
        <Pressable style={[styles.googleBtn, { backgroundColor: colors.accent }, busy && styles.btnDisabled]} onPress={handleSignIn} disabled={busy}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.googleBtnText}>{t.login.continueWithGoogle}</Text>}
        </Pressable>
        <Text style={[styles.googleHint, { color: colors.textSecondary }]}>{t.login.enableBackup}</Text>
        <Pressable style={styles.guestBtn} onPress={handleGuest}>
          <Text style={[styles.guestBtnText, { color: colors.accent }]}>{t.login.continueAsGuest}</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{t.login.disclaimer}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0066D6', justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  subtitle: { fontSize: 15, color: '#6C6C70', textAlign: 'center', marginBottom: 32 },
  googleBtn: { backgroundColor: '#0066D6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, width: '100%', alignItems: 'center', marginBottom: 6 },
  btnDisabled: { opacity: 0.6 },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleHint: { fontSize: 12, color: '#6C6C70', textAlign: 'center', marginBottom: 16 },
  guestBtn: { width: '100%', alignItems: 'center', paddingVertical: 16, marginBottom: 8, minHeight: 48, justifyContent: 'center' },
  guestBtnText: { color: '#0066D6', fontSize: 15, fontWeight: '500' },
  error: { color: '#FF3B30', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  disclaimer: { fontSize: 12, color: '#6C6C70', textAlign: 'center', marginTop: 8 },
});
