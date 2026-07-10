import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../utils/theme';
import {
  cancelAllBirthdayNotifications,
  getScheduledBirthdayCount,
  notificationsAvailable,
  requestNotificationPermissions,
  scheduleAllBirthdayNotifications,
} from '../../utils/notifications';
import {
  BirthdayNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../../utils/notificationSettings';

const DAYS_OPTIONS = [0, 1, 2, 3, 7];

export default function NotificationsScreen() {
  const { t } = useI18n();
  const { contacts, fetchContacts } = useContacts();
  const { isDesktop, r } = useResponsive();
  const { colors } = useTheme();

  const [settings, setSettings] = useState<BirthdayNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [hourText, setHourText] = useState('09');
  const [minuteText, setMinuteText] = useState('00');
  const [loaded, setLoaded] = useState(false);
  const [loadingOp, setLoadingOp] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const s = await loadNotificationSettings();
      setSettings(s);
      setHourText(String(s.hour).padStart(2, '0'));
      setMinuteText(String(s.minute).padStart(2, '0'));
      setLoaded(true);
      fetchContacts();
      getScheduledBirthdayCount().then(setActiveCount);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showStatus = (msg: string, isError = false) => {
    setStatus(msg);
    setStatusError(isError);
  };

  const formatHour = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    setHourText(digits);
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n >= 0 && n <= 23) {
      setSettings(prev => ({ ...prev, hour: n }));
    }
  };

  const formatMinute = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    setMinuteText(digits);
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) {
      setSettings(prev => ({ ...prev, minute: n }));
    }
  };

  const normalizedSettings = (): BirthdayNotificationSettings => {
    const hour = Math.min(Math.max(parseInt(hourText, 10) || 0, 0), 23);
    const minute = Math.min(Math.max(parseInt(minuteText, 10) || 0, 0), 59);
    return {
      ...settings,
      hour,
      minute,
      messageTemplate: settings.messageTemplate?.trim() ? settings.messageTemplate : undefined,
    };
  };

  const handleSaveAndSchedule = async () => {
    try {
      setLoadingOp('save');
      setStatus(null);
      const final = normalizedSettings();
      await saveNotificationSettings(final);
      setSettings(final);

      if (!notificationsAvailable) {
        showStatus(t.notificationsScreen.unavailable, true);
        return;
      }

      if (!final.enabled) {
        const cancelled = await cancelAllBirthdayNotifications();
        setActiveCount(0);
        showStatus(t.notificationsScreen.cancelledAll(cancelled));
        return;
      }

      const granted = await requestNotificationPermissions();
      if (!granted) {
        showStatus(t.notificationsScreen.permError, true);
        return;
      }

      const count = await scheduleAllBirthdayNotifications(contacts, final);
      setActiveCount(count);
      showStatus(t.notificationsScreen.scheduled(count));
    } catch (e) {
      showStatus(t.notificationsScreen.errorPrefix + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setLoadingOp(null);
    }
  };

  const handleCancelAll = async () => {
    const doCancel = async () => {
      try {
        setLoadingOp('cancel');
        setStatus(null);
        const n = await cancelAllBirthdayNotifications();
        setActiveCount(0);
        showStatus(t.notificationsScreen.cancelledAll(n));
      } catch (e) {
        showStatus(t.notificationsScreen.errorPrefix + (e instanceof Error ? e.message : String(e)), true);
      } finally {
        setLoadingOp(null);
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof confirm === 'function' && confirm(t.notificationsScreen.cancelAllConfirmMsg)) {
        await doCancel();
      }
    } else {
      Alert.alert(
        t.notificationsScreen.cancelAllConfirmTitle,
        t.notificationsScreen.cancelAllConfirmMsg,
        [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.common.delete, style: 'destructive', onPress: doCancel },
        ],
      );
    }
  };

  if (!loaded) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const daysLabel = (n: number) =>
    n === 0 ? t.notificationsScreen.daysBefore0 :
    n === 1 ? t.notificationsScreen.daysBefore1 :
    t.notificationsScreen.daysBeforeN(n);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      <Text style={styles.headerDesc}>{t.notificationsScreen.desc}</Text>

      {!notificationsAvailable && (
        <View style={[styles.statusBox, { backgroundColor: colors.statusErrorBg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{t.notificationsScreen.unavailable}</Text>
        </View>
      )}

      {/* Activar */}
      <View style={[styles.card, { backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t.notificationsScreen.enabled}</Text>
            <Text style={styles.cardDesc}>{t.notificationsScreen.enabledDesc}</Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={v => setSettings(prev => ({ ...prev, enabled: v }))}
            trackColor={{ false: colors.separator, true: colors.success }}
          />
        </View>
        {activeCount !== null && (
          <Text style={styles.activeCount}>{t.notificationsScreen.activeCount(activeCount)}</Text>
        )}
      </View>

      {/* Antelación */}
      <View style={[styles.card, { backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t.notificationsScreen.daysBefore}</Text>
        <View style={styles.chipRow}>
          {DAYS_OPTIONS.map(d => (
            <Pressable
              key={d}
              style={[styles.chip, { backgroundColor: colors.fill, borderColor: colors.separator }, settings.daysBefore === d && styles.chipActive]}
              onPress={() => setSettings(prev => ({ ...prev, daysBefore: d }))}
            >
              <Text style={[styles.chipText, { color: colors.text }, settings.daysBefore === d && styles.chipTextActive]}>
                {daysLabel(d)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Hora */}
      <View style={[styles.card, { backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t.notificationsScreen.time}</Text>
        <Text style={styles.cardDesc}>{t.notificationsScreen.timeDesc}</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>{t.notificationsScreen.hour}</Text>
            <TextInput
              style={[styles.timeInput, { backgroundColor: colors.fill, borderColor: colors.inputBorder, color: colors.text }]}
              value={hourText}
              onChangeText={formatHour}
              keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
              maxLength={2}
              placeholder="09"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <Text style={[styles.timeColon, { color: colors.textSecondary }]}>:</Text>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>{t.notificationsScreen.minute}</Text>
            <TextInput
              style={[styles.timeInput, { backgroundColor: colors.fill, borderColor: colors.inputBorder, color: colors.text }]}
              value={minuteText}
              onChangeText={formatMinute}
              keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
              maxLength={2}
              placeholder="00"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>
      </View>

      {/* Mensaje */}
      <View style={[styles.card, { backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t.notificationsScreen.customMessage}</Text>
        <Text style={styles.cardDesc}>{t.notificationsScreen.messageHelp}</Text>
        <TextInput
          style={[styles.messageInput, { backgroundColor: colors.fill, borderColor: colors.inputBorder, color: colors.text }]}
          value={settings.messageTemplate ?? ''}
          onChangeText={text => setSettings(prev => ({ ...prev, messageTemplate: text }))}
          placeholder={t.notificationsScreen.messagePlaceholder}
          placeholderTextColor={colors.placeholder}
          multiline
        />
      </View>

      {/* Acciones */}
      <Pressable
        style={[styles.button, styles.buttonPrimary, !!loadingOp && styles.buttonDisabled]}
        onPress={handleSaveAndSchedule}
        disabled={!!loadingOp}
      >
        {loadingOp === 'save'
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>{t.notificationsScreen.scheduleBtn}</Text>}
      </Pressable>

      <Pressable
        style={[styles.button, styles.buttonDanger, !!loadingOp && styles.buttonDisabled]}
        onPress={handleCancelAll}
        disabled={!!loadingOp}
      >
        {loadingOp === 'cancel'
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>{t.notificationsScreen.cancelAllBtn}</Text>}
      </Pressable>

      {status && (
        <View style={[styles.statusBox, { backgroundColor: statusError ? colors.statusErrorBg : colors.statusSuccessBg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 20, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  contentDesktop: { paddingHorizontal: 32, paddingVertical: 28 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F7' },

  headerDesc: { fontSize: 14, color: '#8E8E93', marginBottom: 16, lineHeight: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#8E8E93', marginBottom: 12, lineHeight: 18 },

  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  activeCount: { fontSize: 13, color: '#34C759', marginTop: 8, fontWeight: '500' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: '#C7C7CC', backgroundColor: '#F9F9F9',
  },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeField: { flex: 1 },
  fieldLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 6, fontWeight: '600' },
  timeInput: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 18, color: '#000', backgroundColor: '#F9F9F9',
    textAlign: 'center',
  },
  timeColon: { fontSize: 22, fontWeight: '700', color: '#8E8E93', paddingBottom: 10 },

  messageInput: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#000', backgroundColor: '#F9F9F9',
    minHeight: 80, textAlignVertical: 'top',
  },

  button: {
    paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 6, marginBottom: 8,
  },
  buttonPrimary: { backgroundColor: '#007AFF' },
  buttonDanger: { backgroundColor: '#FF3B30' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  statusBox: {
    marginTop: 8, padding: 12,
    backgroundColor: '#E8F5E9', borderRadius: 8,
  },
  statusBoxError: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 14, color: '#333' },
});
