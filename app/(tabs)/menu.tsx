import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../utils/i18n';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../utils/theme';

export default function MenuScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isDesktop, r } = useResponsive();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop, { backgroundColor: colors.bg }]}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
        <Pressable style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.separator }]} onPress={() => router.push('/notifications')}>
          <View style={styles.left}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSubtle }]}>
              <Ionicons name="notifications" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{t.tabs.notifications}</Text>
              <Text style={styles.itemSubtitle}>{t.menu.notifications}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.menuItem, { marginTop: r(12, 12, 16), backgroundColor: colors.surface, borderColor: colors.separator }]} onPress={() => router.push('/sync')}>
          <View style={styles.left}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(52,168,83,0.12)' }]}>
              <Ionicons name="refresh" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{t.tabs.sync}</Text>
              <Text style={styles.itemSubtitle}>{t.menu.sync}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.menuItem, { marginTop: r(12, 12, 16), backgroundColor: colors.surface, borderColor: colors.separator }]} onPress={() => router.push('/config')}>
          <View style={styles.left}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSubtle }]}>
              <Ionicons name="settings" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{t.config.title}</Text>
              <Text style={styles.itemSubtitle}>{t.menu.config}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
