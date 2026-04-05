import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useI18n } from '../../utils/i18n';

export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs>
      <Tabs.Screen name="index" options={{
        headerTitle: t.tabs.contacts,
        tabBarLabel: t.tabs.contacts,
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="config" options={{
        headerTitle: t.tabs.config,
        tabBarLabel: t.tabs.config,
        tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
