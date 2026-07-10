import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../utils/i18n';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../utils/theme';

export default function TabsLayout() {
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarPosition: isDesktop && isWeb ? 'top' : 'bottom',
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: isDesktop && isWeb ? {
          ...styles.tabBarTop,
          backgroundColor: colors.surface,
          borderBottomColor: colors.separator,
          paddingTop: insets.top,
        } : {
          ...styles.tabBarBottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.separator,
        },
        tabBarLabelStyle: isDesktop && isWeb
          ? { fontSize: 13, fontWeight: '600' }
          : { fontSize: 10, fontWeight: '500', marginBottom: 2 },
        tabBarIconStyle: isDesktop && isWeb ? { marginBottom: 0 } : undefined,
        tabBarItemStyle: isDesktop && isWeb ? { paddingVertical: 8 } : undefined,
      }}
    >
      <Tabs.Screen name="index" options={{
        headerTitle: t.tabs.contacts,
        tabBarLabel: t.tabs.contacts,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="calendar" options={{
        headerTitle: t.tabs.calendar,
        tabBarLabel: t.tabs.calendar,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="menu" options={{
        headerTitle: t.tabs.menu,
        tabBarLabel: t.tabs.menu,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'} size={size} color={color} />
        ),
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
    borderBottomColor: 'rgba(60,60,67,0.2)',
    backgroundColor: '#fff',
  },
  tabBarBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60,60,67,0.2)',
    backgroundColor: '#fff',
  },
});
