import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../utils/authContext';
import { ContactsProvider } from '../utils/context';
import { I18nProvider } from '../utils/i18n';
import { checkBirthdaysOnStartup, requestNotificationPermissions } from '../utils/notifications';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    const hasAccess = !!user || isGuest;
    if (!hasAccess && !inLogin) router.replace('/login');
    if (hasAccess && inLogin) router.replace('/');
  }, [user, isGuest, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions();
    checkBirthdaysOnStartup();
  }, []);

  return (
    <I18nProvider>
      <AuthProvider>
        <ContactsProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar barStyle={'dark-content'} />
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
      </AuthProvider>
    </I18nProvider>
  );
}
