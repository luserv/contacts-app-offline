import { useRouter } from 'expo-router';
import { Bell, ChevronRight, RefreshCw, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../utils/i18n';
import { useResponsive } from '../../utils/responsive';

export default function MenuScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const { isDesktop, r } = useResponsive();

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
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

        <Pressable style={[styles.menuItem, { marginTop: r(12, 12, 16) }]} onPress={() => router.push('/sync')}>
          <View style={styles.left}>
            <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
              <RefreshCw size={18} color="#34A853" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{t.tabs.sync}</Text>
              <Text style={styles.itemSubtitle}>
                {lang === 'es'
                  ? 'Respaldo, restauración y Google Drive'
                  : 'Backup, restore and Google Drive'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#8E8E93" />
        </Pressable>

        <Pressable style={[styles.menuItem, { marginTop: r(12, 12, 16) }]} onPress={() => router.push('/config')}>
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              <Settings size={18} color="#007AFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{t.config.title}</Text>
              <Text style={styles.itemSubtitle}>
                {lang === 'es'
                  ? 'Idioma, cuenta y licencia'
                  : 'Language, account and license'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#8E8E93" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  containerDesktop: { alignItems: 'center' },
  inner: { flex: 1 },
  innerDesktop: { maxWidth: 800, width: '100%' },
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
