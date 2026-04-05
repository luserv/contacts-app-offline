import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../utils/i18n';

export default function BottomTabBar() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Pressable style={styles.tab} onPress={() => router.push('/')}>
        <Ionicons name="home-outline" size={24} color="#007AFF" />
        <Text style={styles.label}>{t.tabs.contacts}</Text>
      </Pressable>
      <Pressable style={styles.tab} onPress={() => router.push('/config')}>
        <Ionicons name="settings-outline" size={24} color="#007AFF" />
        <Text style={styles.label}>{t.tabs.config}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    backgroundColor: '#F9F9F9',
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 10, color: '#007AFF', marginTop: 3,
  },
});
