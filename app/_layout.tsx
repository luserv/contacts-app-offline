import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../utils/authContext';
import { ContactsProvider } from '../utils/context';
import { I18nProvider, useI18n } from '../utils/i18n';
import { checkBirthdaysOnStartup, requestNotificationPermissions } from '../utils/notifications';
import { ThemeProvider, useTheme } from '../utils/theme';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    const hasAccess = !!user || isGuest;
    if (!hasAccess && !inLogin) router.replace('/login');
    if (hasAccess && inLogin) router.replace('/');
  }, [user, isGuest, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, fontSize: 15, color: colors.textSecondary }}>{t.common.authChecking}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function ThemedApp() {
  const { isDark } = useTheme();
  return (
    <ContactsProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <AuthGate>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
            }} />
            <Stack.Screen
              name="contact/[id]"
              options={{ headerShown: true }}
            />
          </Stack>
        </AuthGate>
      </GestureHandlerRootView>
    </ContactsProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    requestNotificationPermissions();
    checkBirthdaysOnStartup();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <I18nProvider>
      <AuthProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
