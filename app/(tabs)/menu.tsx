import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../utils/i18n';

export default function MenuScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();

  return (
    <View style={styles.container}>
      <Pressable style={styles.menuItem} onPress={() => router.push('/notifications')}>
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Bell size={18} color="#007AFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{t.tabs.notifications}</Text>
            <Text style={styles.itemSubtitle}>
              {lang === 'es'
                ? 'Personaliza los recordatorios de cumpleaños'
                : 'Customize birthday reminders'}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8E8E93" />
      </Pressable>

      <Pressable style={[styles.menuItem, { marginTop: 12 }]} onPress={() => router.push('/config')}>
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Settings size={18} color="#007AFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{t.config.title}</Text>
            <Text style={styles.itemSubtitle}>
              {lang === 'es'
                ? 'Idioma, respaldos y Google Drive'
                : 'Language, backups and Google Drive'}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8E8E93" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  menuItem: {
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  itemSubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
});
