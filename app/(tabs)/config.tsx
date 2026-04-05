import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../utils/authContext';
import { downloadDB, uploadDB } from '../../utils/driveSync';

const PAYPAL_ME = process.env.EXPO_PUBLIC_PAYPAL_ME ?? 'https://paypal.me/TUUSUARIO';
const LICENSE_PRICE = process.env.EXPO_PUBLIC_LICENSE_PRICE ?? '4.99';
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'tu@email.com';
import { DB_NAME, useContacts } from '../../utils/context';
import { Lang, useI18n } from '../../utils/i18n';
import { getScheduledBirthdayCount, notificationsAvailable, requestNotificationPermissions, scheduleAllBirthdayNotifications } from '../../utils/notifications';

const DB_PATH = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function Config() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notifCount, setNotifCount] = useState<number | null>(null);
  const { contacts, fetchContacts, importVcf } = useContacts();
  const { t, lang, setLang } = useI18n();
  const { user, licensed, signIn, signOutUser, driveToken } = useAuth();
  const router = useRouter();
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronFS;

  useEffect(() => {
    fetchContacts();
    getScheduledBirthdayCount().then(setNotifCount);
  }, []);

  const handleExport = async () => {
    try {
      setIsLoading(true);
      setStatus(null);

      // Electron
      if (typeof window !== 'undefined' && (window as any).electronFS) {
        const result = await (window as any).electronFS.exportDB();
        if (result.canceled) return;
        if (result.error) { setStatus(t.config.exportErrorPrefix + result.error); return; }
        setStatus(t.config.exportSuccess);
        return;
      }

      const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (!dbInfo.exists) {
        setStatus(t.config.dbNotFound);
        return;
      }

      const exportPath = `${FileSystem.cacheDirectory}contacts_backup_${Date.now()}.db`;
      await FileSystem.copyAsync({ from: DB_PATH, to: exportPath });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setStatus(t.config.sharingUnavailable);
        return;
      }

      await Sharing.shareAsync(exportPath, {
        mimeType: 'application/octet-stream',
        dialogTitle: t.config.exportBtn,
        UTI: 'public.database',
      });

      setStatus(t.config.exportSuccess);
    } catch (e) {
      console.error(e);
      setStatus(t.config.exportErrorPrefix + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleNotifications = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setStatus(t.config.notifPermError);
        return;
      }
      const count = await scheduleAllBirthdayNotifications(contacts);
      setNotifCount(count);
      setStatus(t.config.notifScheduled(count));
    } catch (e) {
      setStatus(t.config.notifErrorPrefix + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportVcf = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      let content: string | null = null;

      if (typeof window !== 'undefined' && (window as any).electronFS) {
        const result = await (window as any).electronFS.readVcf();
        if (result.canceled) return;
        if (result.error) { setStatus('Error: ' + result.error); return; }
        content = result.content;
      } else {
        const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (picked.canceled) return;
        content = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      }

      if (!content) return;
      const { imported, skipped } = await importVcf(content);
      setStatus(`VCF: ${imported} importados${skipped > 0 ? `, ${skipped} omitidos` : ''}.`);
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    // Electron: abrir diálogo nativo directamente (sin Alert intermedio)
    if (typeof window !== 'undefined' && (window as any).electronFS) {
      if (!confirm(t.config.importConfirm)) return;
      try {
        setIsLoading(true);
        setStatus(null);
        const result = await (window as any).electronFS.importDB();
        if (result.canceled) return;
        if (result.error) { setStatus(t.config.importErrorPrefix + result.error); return; }
        setStatus(t.config.importSuccess);
        await fetchContacts();
      } catch (e) {
        setStatus(t.config.importErrorPrefix + (e instanceof Error ? e.message : String(e)));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    Alert.alert(
      t.config.importTitle,
      t.config.importConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.config.importContinue, style: 'destructive', onPress: async () => {
            try {
              setIsLoading(true);
              setStatus(null);

              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
              });

              if (result.canceled) {
                setIsLoading(false);
                return;
              }

              const file = result.assets[0];

              const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
              const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
              }

              await FileSystem.copyAsync({ from: file.uri, to: DB_PATH });

              setStatus(t.config.importSuccess);
              Alert.alert(t.config.importSuccessTitle, t.config.importSuccessMsg);
            } catch (e) {
              console.error(e);
              setStatus(t.config.importErrorPrefix + (e instanceof Error ? e.message : String(e)));
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Verificación de sesión Drive ──────────────────────────────────────────

  /**
   * Muestra una alerta para re-autenticar cuando la sesión de Drive no está activa.
   * Llama a signIn() en web/Electron; redirige a login en Android (donde el flujo
   * OAuth es manejado por expo-auth-session en login.native.tsx).
   */
  const promptSignIn = () => {
    const title = driveToken === null && !user ? t.drive.notLoggedInTitle : t.drive.sessionExpiredTitle;
    const msg   = driveToken === null && !user ? t.drive.notLoggedInMsg   : t.drive.sessionExpiredMsg;

    const doSignIn = async () => {
      try {
        await signIn();
      } catch (e: any) {
        if (e.message === 'USE_EXPO_AUTH') {
          router.push('/login' as any);
        } else {
          setStatus(t.drive.errorPrefix + e.message);
        }
      }
    };

    if (isElectron) {
      if (confirm(msg)) doSignIn();
    } else {
      Alert.alert(title, msg, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.drive.signInBtn, onPress: doSignIn },
      ]);
    }
  };

  // ── Drive upload ──────────────────────────────────────────────────────────

  const handleDriveUpload = async () => {
    if (!driveToken) { promptSignIn(); return; }
    try {
      setIsLoading(true);
      setStatus(null);
      let base64: string;
      if (typeof window !== 'undefined' && (window as any).electronDrive) {
        base64 = await (window as any).electronDrive.readDBAsBase64();
      } else {
        base64 = await FileSystem.readAsStringAsync(DB_PATH, { encoding: FileSystem.EncodingType.Base64 });
      }
      await uploadDB(driveToken, base64);
      setStatus(t.drive.uploadSuccess);
    } catch (e: any) {
      if (e.message === 'TOKEN_EXPIRED') promptSignIn();
      else setStatus(t.drive.errorPrefix + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Drive restore ─────────────────────────────────────────────────────────

  const handleDriveRestore = async () => {
    if (!driveToken) { promptSignIn(); return; }

    const doRestore = async () => {
      try {
        setIsLoading(true);
        setStatus(null);
        const base64 = await downloadDB(driveToken!);
        if (typeof window !== 'undefined' && (window as any).electronDrive) {
          const result = await (window as any).electronDrive.writeDBFromBase64(base64);
          if (result?.error) throw new Error(result.error);
        } else {
          const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
          const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
          if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
          await FileSystem.writeAsStringAsync(DB_PATH, base64, { encoding: FileSystem.EncodingType.Base64 });
        }
        setStatus(t.drive.restoreSuccess);
        await fetchContacts();
      } catch (e: any) {
        if (e.message === 'NO_BACKUP') setStatus(t.drive.notFound);
        else if (e.message === 'TOKEN_EXPIRED') promptSignIn();
        else setStatus(t.drive.errorPrefix + e.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (isElectron) {
      if (confirm(t.config.importConfirm)) doRestore();
    } else {
      Alert.alert(t.config.importTitle, t.config.importConfirm, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.config.importContinue, style: 'destructive', onPress: doRestore },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.config.title}</Text>

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

      {/* Notificaciones */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.cardTitle}>{t.config.notifications}</Text>
        <Text style={styles.cardDesc}>
          {t.config.notificationsDesc}
          {notifCount !== null ? t.config.notificationsActive(notifCount) : ''}
        </Text>
        {notificationsAvailable ? (
          <Pressable
            style={[styles.button, styles.buttonNotif, isLoading && styles.buttonDisabled]}
            onPress={handleScheduleNotifications}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t.config.scheduleBtn}</Text>
          </Pressable>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{t.config.notificationsUnavailable}</Text>
          </View>
        )}
      </View>

      {/* Cuenta */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.cardTitle}>Cuenta</Text>
        <View style={styles.accountRow}>
          <View>
            <Text style={styles.accountEmail}>{user?.email}</Text>
            <Text style={styles.accountLicense}>
              {licensed ? '✅ Licencia activa' : '🔒 Plan gratuito'}
            </Text>
          </View>
        </View>
        <Pressable style={[styles.button, styles.buttonSignOut]} onPress={signOutUser}>
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </Pressable>
      </View>

      {/* Upgrade — solo visible si no tiene licencia y está logueado */}
      {!licensed && user && (
        <View style={[styles.card, { marginBottom: 16 }]}>
          <Text style={styles.cardTitle}>Quitar anuncios</Text>
          <Text style={styles.cardDesc}>
            Paga una vez y elimina los anuncios para siempre. Precio: ${LICENSE_PRICE} USD.
          </Text>

          <Text style={styles.upgradeStep}>1. Copia tu ID de usuario:</Text>
          <View style={styles.uidRow}>
            <TextInput
              style={styles.uidInput}
              value={user.uid}
              editable={false}
              selectTextOnFocus
            />
          </View>

          <Text style={styles.upgradeStep}>2. Paga con PayPal:</Text>
          <Pressable
            style={[styles.button, styles.buttonPayPal]}
            onPress={() => Linking.openURL(PAYPAL_ME)}
          >
            <Text style={styles.buttonText}>Pagar con PayPal — ${LICENSE_PRICE}</Text>
          </Pressable>

          <Text style={styles.upgradeHint}>
            3. Envía el comprobante de pago junto con tu ID de usuario al correo{' '}
            <Text
              style={styles.upgradeLink}
              onPress={() => Linking.openURL(
                `mailto:${SUPPORT_EMAIL}?subject=Licencia%20Contacts&body=ID%20de%20usuario%3A%20${user.uid}`
              )}
            >
              {SUPPORT_EMAIL}
            </Text>
            {' '}y activamos tu licencia en menos de 24 h.
          </Text>
        </View>
      )}

      {/* Base de datos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.config.database}</Text>
        <Text style={styles.cardDesc}>{t.config.databaseDesc}</Text>

        <Pressable
          style={[styles.button, styles.buttonVcf, isLoading && styles.buttonDisabled]}
          onPress={handleImportVcf}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{t.config.importVcfBtn}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonExport, isLoading && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{t.config.exportBtn}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonImport, isLoading && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{t.config.importBtn}</Text>
        </Pressable>

        {status && (
          <View style={[styles.statusBox, status.startsWith('Error') && styles.statusBoxError]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </View>

      {/* Google Drive */}
      {user && (
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>{t.drive.title}</Text>
          <Text style={styles.cardDesc}>{t.drive.desc}</Text>
          <Pressable
            style={[styles.button, styles.buttonDrive, isLoading && styles.buttonDisabled]}
            onPress={handleDriveUpload}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? t.drive.uploading : t.drive.upload}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonDriveRestore, isLoading && styles.buttonDisabled]}
            onPress={handleDriveRestore}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? t.drive.restoring : t.drive.restore}</Text>
          </Pressable>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
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
  buttonVcf: { backgroundColor: '#5856D6' },
  buttonSignOut: { backgroundColor: '#FF3B30' },
  accountRow: { marginBottom: 16 },
  accountEmail: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 4 },
  accountLicense: { fontSize: 13, color: '#8E8E93' },
  buttonNotif: { backgroundColor: '#FF9500' },
  buttonExport: { backgroundColor: '#007AFF' },
  buttonImport: { backgroundColor: '#34C759' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  statusBoxError: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  buttonPayPal: { backgroundColor: '#003087' },
  buttonDrive: { backgroundColor: '#1a73e8' },
  buttonDriveRestore: { backgroundColor: '#34A853' },
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
