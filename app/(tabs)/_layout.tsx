import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../utils/i18n';
import { useResponsive } from '../../utils/responsive';

export default function TabsLayout() {
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();

  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarPosition: isDesktop && isWeb ? 'top' : 'bottom',
        tabBarStyle: isDesktop && isWeb ? {
          ...styles.tabBarTop,
          paddingTop: insets.top,
        } : styles.tabBarBottom,
        tabBarLabelStyle: isDesktop && isWeb ? { fontSize: 13, fontWeight: '600' } : undefined,
        tabBarIconStyle: isDesktop && isWeb ? { marginBottom: 0 } : undefined,
        tabBarItemStyle: isDesktop && isWeb ? { paddingVertical: 8 } : undefined,
      }}
    >
      <Tabs.Screen name="index" options={{
        headerTitle: t.tabs.contacts,
        tabBarLabel: t.tabs.contacts,
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="calendar" options={{
        headerTitle: t.tabs.calendar,
        tabBarLabel: t.tabs.calendar,
        tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
      }} />
      <Tabs.Screen name="menu" options={{
        headerTitle: t.tabs.menu,
        tabBarLabel: t.tabs.menu,
        tabBarIcon: ({ color, size }) => <Ionicons name="menu" size={size} color={color} />,
      }} />
      <Tabs.Screen name="sync" options={{
        href: null,
        headerTitle: t.tabs.sync,
      }} />
      <Tabs.Screen name="config" options={{
        href: null,
        headerTitle: t.config.title,
      }} />
      <Tabs.Screen name="notifications" options={{
        href: null,
        headerTitle: t.tabs.notifications,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  tabBarBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
});
