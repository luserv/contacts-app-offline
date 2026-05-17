import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../utils/authContext';
import { useResponsive } from '../../utils/responsive';

const PAYPAL_ME = process.env.EXPO_PUBLIC_PAYPAL_ME ?? 'https://paypal.me/TUUSUARIO';
const LICENSE_PRICE = process.env.EXPO_PUBLIC_LICENSE_PRICE ?? '4.99';
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'tu@email.com';
import { Lang, useI18n } from '../../utils/i18n';

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function Config() {
  const { t, lang, setLang } = useI18n();
  const { user, licensed, signOutUser } = useAuth();
  const router = useRouter();
  const { isDesktop } = useResponsive();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {/* Idioma */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.cardTitle}>{t.config.language}</Text>
        <Text style={styles.cardDesc}>{t.config.languageDesc}</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, lang === l.code && styles.langLabelActive]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Cuenta */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.cardTitle}>Account</Text>
        <View style={styles.accountRow}>
          <View>
            <Text style={styles.accountEmail}>{user?.email}</Text>
            <Text style={styles.accountLicense}>
              {licensed ? '✅ Active license' : '🔒 Free plan'}
            </Text>
          </View>
        </View>
        <Pressable style={[styles.button, styles.buttonSignOut]} onPress={signOutUser}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>

      {/* Upgrade — solo visible si no tiene licencia y está logueado */}
      {!licensed && user && (
        <View style={[styles.card, { marginBottom: 16 }]}>
          <Text style={styles.cardTitle}>Remove ads</Text>
          <Text style={styles.cardDesc}>
            Pay once and remove ads forever. Price: ${LICENSE_PRICE} USD.
          </Text>

          <Text style={styles.upgradeStep}>1. Copy your User ID:</Text>
          <View style={styles.uidRow}>
            <TextInput
              style={styles.uidInput}
              value={user.uid}
              editable={false}
              selectTextOnFocus
            />
          </View>

          <Text style={styles.upgradeStep}>2. Pay with PayPal:</Text>
          <Pressable
            style={[styles.button, styles.buttonPayPal]}
            onPress={() => Linking.openURL(PAYPAL_ME)}
          >
            <Text style={styles.buttonText}>Pay with PayPal — ${LICENSE_PRICE}</Text>
          </Pressable>

          <Text style={styles.upgradeHint}>
            3. Send the payment receipt along with your User ID to{' '}
            <Text
              style={styles.upgradeLink}
              onPress={() => Linking.openURL(
                `mailto:${SUPPORT_EMAIL}?subject=Contacts%20License&body=User%20ID%3A%20${user.uid}`
              )}
            >
              {SUPPORT_EMAIL}
            </Text>
            {' '}and we will activate your license within 24 hours.
          </Text>
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
    color: '#8E8E93',
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
    borderColor: '#007AFF',
    backgroundColor: '#E5F0FF',
  },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  langLabelActive: { color: '#007AFF', fontWeight: '700' },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonSignOut: { backgroundColor: '#FF3B30' },
  accountRow: { marginBottom: 16 },
  accountEmail: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 4 },
  accountLicense: { fontSize: 13, color: '#8E8E93' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonPayPal: { backgroundColor: '#003087' },
  upgradeStep: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  uidRow: { marginBottom: 16 },
  uidInput: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 13, color: '#555', backgroundColor: '#F9F9F9',
    fontFamily: 'monospace',
  },
  upgradeHint: { fontSize: 13, color: '#8E8E93', lineHeight: 20, marginTop: 8 },
  upgradeLink: { color: '#007AFF', textDecorationLine: 'underline' },
});
