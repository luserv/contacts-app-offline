import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../utils/authContext';
import { useResponsive } from '../../utils/responsive';
import { ThemePref, useTheme } from '../../utils/theme';
import { Lang, useI18n } from '../../utils/i18n';
import { isRCAvailable, rcGetOffering, rcPurchase, rcRestore, type RCOffering } from '../../utils/purchases';

const LANGUAGES: { code: Lang; transKey: 'langSpanish' | 'langEnglish'; flag: string }[] = [
  { code: 'es', transKey: 'langSpanish', flag: '🇪🇸' },
  { code: 'en', transKey: 'langEnglish', flag: '🇬🇧' },
];

const THEME_OPTIONS: { pref: ThemePref; key: 'themeLight' | 'themeSystem' | 'themeDark' }[] = [
  { pref: 'light', key: 'themeLight' },
  { pref: 'system', key: 'themeSystem' },
  { pref: 'dark', key: 'themeDark' },
];

export default function Config() {
  const { t, lang, setLang } = useI18n();
  const { user, isGuest, licensed, signIn, signOutUser } = useAuth();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { colors, preference, setPreference } = useTheme();
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const [offering, setOffering] = useState<RCOffering | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isRCAvailable && !licensed) {
      rcGetOffering().then(setOffering).catch(() => {});
    }
  }, [licensed]);

  const handlePurchase = async () => {
    if (!offering) return;
    try {
      setPurchasing(true);
      const ok = await rcPurchase(offering);
      if (!ok) Alert.alert('', t.config.purchaseError);
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert(t.common.error, e?.message ?? t.config.unknownError);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleGuestSignIn = async () => {
    setSignInError(null);
    setSignInBusy(true);
    try {
      await signIn();
    } catch (e: any) {
      setSignInError(e.message);
    } finally {
      setSignInBusy(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      const ok = await rcRestore();
      Alert.alert(
        ok ? '✅' : 'ℹ️',
        ok
          ? t.config.licenseRestored
          : t.config.noPreviousPurchases
      );
    } catch (e: any) {
      Alert.alert(t.common.error, e?.message ?? t.config.unknownError);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {/* Idioma */}
      <View style={[styles.card, { marginBottom: 16, backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t.config.language}</Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{t.config.languageDesc}</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              style={[styles.langBtn, { backgroundColor: colors.fill, borderColor: colors.separator }, lang === l.code && styles.langBtnActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, { color: colors.text }, lang === l.code && styles.langLabelActive, { color: colors.accent }]}>{t.config[l.transKey]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Cuenta — invitado */}
      {!user && (
        <View style={[styles.card, { marginBottom: 16, backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t.config.account}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {t.config.accountGuestDesc}
          </Text>
          <Pressable
            style={[styles.button, styles.buttonUpgrade, signInBusy && styles.buttonDisabled]}
            onPress={handleGuestSignIn}
            disabled={signInBusy}
          >
            {signInBusy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{t.config.signInWithGoogle}</Text>}
          </Pressable>
          {signInError && <Text style={styles.error}>{signInError}</Text>}
        </View>
      )}

      {/* Cuenta */}
      {user && (
        <View style={[styles.card, { marginBottom: 16, backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t.config.account}</Text>
          <View style={styles.accountRow}>
            <Text style={[styles.accountEmail, { color: colors.text }]}>{user.email}</Text>
            <Text style={[styles.accountLicense, { color: colors.textSecondary }]}>
              {licensed ? t.config.activeLicense : t.config.freePlan}
            </Text>
          </View>
          <Pressable style={[styles.button, styles.buttonSignOut]} onPress={signOutUser}>
            <Text style={styles.buttonText}>{t.config.signOut}</Text>
          </Pressable>
        </View>
      )}

      {/* Upgrade — solo Android, solo si no tiene licencia */}
      {user && !licensed && isRCAvailable && (
        <View style={[styles.card, { marginBottom: 16, backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t.config.removeAds}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {t.config.removeAdsDesc}
          </Text>

          <Pressable
            style={[styles.button, styles.buttonUpgrade, (purchasing || !offering) && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing || !offering}
          >
            {purchasing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>
                  {offering
                    ? `${t.config.buy} — ${offering.product.priceString}`
                    : t.config.loading}
                </Text>}
          </Pressable>

          <Pressable
            style={[styles.buttonRestore, restoring && styles.buttonDisabled]}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring
              ? <ActivityIndicator color="#007AFF" size="small" />
              : <Text style={[styles.buttonRestoreText, { color: colors.accent }]}>
                  {t.config.restorePurchase}
                </Text>}
          </Pressable>
        </View>
      )}

      {/* Modo oscuro */}
      {user && (
        <View style={[styles.card, { marginBottom: 16, backgroundColor: colors.surface, shadowOpacity: colors.shadowOpacity }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t.config.darkMode}
          </Text>
          {licensed ? (
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map(opt => (
                <Pressable
                  key={opt.pref}
                  style={[styles.themeBtn, { borderColor: colors.separator, backgroundColor: colors.fill },
                    preference === opt.pref && { borderColor: colors.accent, backgroundColor: colors.accentSubtle }]}
                  onPress={() => setPreference(opt.pref)}
                >
                  <Text style={[styles.themeBtnText, { color: colors.textSecondary },
                    preference === opt.pref && { color: colors.accent, fontWeight: '700' }]}>
                    {t.config[opt.key]}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.premiumHint, { color: colors.textSecondary }]}>
              {t.config.darkModePremium}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 32,
    paddingVertical: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 16,
    lineHeight: 20,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    backgroundColor: '#F9F9F9',
  },
  langBtnActive: {
    borderColor: '#0066D6',
    backgroundColor: '#E5F0FF',
  },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  langLabelActive: { color: '#0066D6', fontWeight: '700' },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonSignOut: { backgroundColor: '#FF3B30' },
  accountRow: { marginBottom: 16 },
  accountEmail: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 4 },
  accountLicense: { fontSize: 13, color: '#6C6C70' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonUpgrade: { backgroundColor: '#0066D6' },
  buttonRestore: { alignItems: 'center', paddingVertical: 14, minHeight: 48, justifyContent: 'center' },
  buttonRestoreText: { fontSize: 14, color: '#0066D6' },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  themeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center',
  },
  themeBtnText: { fontSize: 14 },
  premiumHint: { fontSize: 13, color: '#6C6C70', lineHeight: 20, marginTop: 4 },
  error: { color: '#FF3B30', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
