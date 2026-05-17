import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { checkBackupExists, downloadDB, uploadDB } from '../../utils/driveSync';
import {
  exportDatabaseToFile,
  importDatabaseFromFile,
  readDatabaseAsBase64,
  reloadDatabase,
  writeDatabaseFromBase64,
} from '../../utils/db';
import { useAuth } from '../../utils/authContext';
import { useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { useResponsive } from '../../utils/responsive';
import { useRouter } from 'expo-router';

export default function SyncScreen() {
  const [status, setStatus] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<string | null>(null);
  const [loadingOp, setLoadingOp] = useState<string | null>(null);
  const [hasBackup, setHasBackup] = useState<boolean | null>(null);
  const { user, driveToken, refreshDriveToken, signIn } = useAuth();
  const { fetchContacts, importVcf } = useContacts();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronFS;

  useEffect(() => {
    if (!driveToken) { setHasBackup(null); return; }
    let cancelled = false;
    checkBackupExists(driveToken).then(exists => {
      if (!cancelled) setHasBackup(exists);
    }).catch(() => {
      if (!cancelled) setHasBackup(false);
    });
    return () => { cancelled = true; };
  }, [driveToken]);

  const handleExport = async () => {
    try {
      setLoadingOp('export');
      setStatus(null);

      if (typeof window !== 'undefined' && (window as any).electronFS) {
        const result = await (window as any).electronFS.exportDB();
        if (result.canceled) return;
        if (result.error) { setStatus(t.config.exportErrorPrefix + result.error); return; }
        setStatus(t.config.exportSuccess);
        return;
      }

      const cacheDir = FileSystem.cacheDirectory ?? '';
      const exportPath = cacheDir.endsWith('/')
        ? `${cacheDir}contacts_backup_${Date.now()}.db`
        : `${cacheDir}/contacts_backup_${Date.now()}.db`;
      await exportDatabaseToFile(exportPath);

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
      setLoadingOp(null);
    }
  };

  const handleImportVcf = async () => {
    try {
      setLoadingOp('vcf');
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
      setStatus(`VCF: ${imported} imported${skipped > 0 ? `, ${skipped} skipped` : ''}.`);
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoadingOp(null);
    }
  };

  const handleImport = async () => {
    if (typeof window !== 'undefined' && (window as any).electronFS) {
      if (!confirm(t.config.importConfirm)) return;
      try {
        setLoadingOp('import');
        setStatus(null);
        const result = await (window as any).electronFS.importDB();
        if (result.canceled) return;
        if (result.error) { setStatus(t.config.importErrorPrefix + result.error); return; }
        setStatus(t.config.importSuccess);
        await fetchContacts();
      } catch (e) {
        setStatus(t.config.importErrorPrefix + (e instanceof Error ? e.message : String(e)));
      } finally {
        setLoadingOp(null);
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
              setLoadingOp('import');
              setStatus(null);

              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
              });

              if (result.canceled) {
                setLoadingOp(null);
                return;
              }

              const file = result.assets[0];

              await importDatabaseFromFile(file.uri);
              await fetchContacts();

              setStatus(t.config.importSuccess);
              Alert.alert(t.config.importSuccessTitle, t.config.importSuccessMsg);
            } catch (e) {
              console.error(e);
              setStatus(t.config.importErrorPrefix + (e instanceof Error ? e.message : String(e)));
            } finally {
              setLoadingOp(null);
            }
          },
        },
      ]
    );
  };

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

  const handleDriveUpload = async () => {
    let token = driveToken;
    if (!token) {
      token = await refreshDriveToken();
      if (!token) { promptSignIn(); return; }
    }
    try {
      setLoadingOp('upload');
      setDriveStatus(null);
      let base64: string;
      if (typeof window !== 'undefined' && (window as any).electronDrive) {
        base64 = await (window as any).electronDrive.readDBAsBase64();
      } else {
        base64 = await readDatabaseAsBase64();
      }
      await uploadDB(token, base64);
      setDriveStatus(t.drive.uploadSuccess);
      setHasBackup(true);
    } catch (e: any) {
      if (e.message === 'TOKEN_EXPIRED') {
        const newToken = await refreshDriveToken();
        if (newToken) {
          try {
            let base64: string;
            if (typeof window !== 'undefined' && (window as any).electronDrive) {
              base64 = await (window as any).electronDrive.readDBAsBase64();
            } else {
              base64 = await readDatabaseAsBase64();
            }
            await uploadDB(newToken, base64);
            setDriveStatus(t.drive.uploadSuccess);
            setHasBackup(true);
          } catch {
            promptSignIn();
          }
        } else {
          promptSignIn();
        }
      } else {
        setDriveStatus(t.drive.errorPrefix + e.message);
      }
    } finally {
      setLoadingOp(null);
    }
  };

  const handleDriveRestore = async () => {
    if (!driveToken) { promptSignIn(); return; }

    const doRestore = async () => {
      let token = driveToken ?? await refreshDriveToken();
      if (!token) { promptSignIn(); return; }
      try {
        setLoadingOp('restore');
        setDriveStatus(null);
        const base64 = await downloadDB(token);
        if (typeof window !== 'undefined' && (window as any).electronDrive) {
          const result = await (window as any).electronDrive.writeDBFromBase64(base64);
          if (result?.error) throw new Error(result.error);
        } else {
          await writeDatabaseFromBase64(base64);
        }
        setDriveStatus(t.drive.restoreSuccess);
        await reloadDatabase();
        await fetchContacts();
      } catch (e: any) {
        if (e.message === 'NO_BACKUP') {
          setDriveStatus(t.drive.notFound);
          setHasBackup(false);
        } else if (e.message === 'TOKEN_EXPIRED') {
          const newToken = await refreshDriveToken();
          if (newToken) doRestore();
          else promptSignIn();
        } else {
          setDriveStatus(t.drive.errorPrefix + e.message);
        }
      } finally {
        setLoadingOp(null);
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
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {/* Base de datos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.config.database}</Text>
        <Text style={styles.cardDesc}>{t.config.databaseDesc}</Text>

        <Pressable
          style={[styles.button, styles.buttonVcf, !!loadingOp && styles.buttonDisabled]}
          onPress={handleImportVcf}
          disabled={!!loadingOp}
        >
          {loadingOp === 'vcf'
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t.config.importVcfBtn}</Text>}
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonExport, !!loadingOp && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={!!loadingOp}
        >
          {loadingOp === 'export'
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t.config.exportBtn}</Text>}
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonImport, !!loadingOp && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={!!loadingOp}
        >
          {loadingOp === 'import'
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t.config.importBtn}</Text>}
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
            style={[styles.button, styles.buttonDrive, !!loadingOp && styles.buttonDisabled]}
            onPress={handleDriveUpload}
            disabled={!!loadingOp}
          >
            {loadingOp === 'upload'
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{t.drive.upload}</Text>}
          </Pressable>
          {hasBackup === false && (
            <View style={[styles.statusBox, styles.statusBoxError, { marginBottom: 10 }]}>
              <Text style={styles.statusText}>{t.drive.notFound}</Text>
            </View>
          )}
          <Pressable
            style={[styles.button, styles.buttonDriveRestore, (!!loadingOp || hasBackup === false) && styles.buttonDisabled]}
            onPress={handleDriveRestore}
            disabled={!!loadingOp || hasBackup === false}
          >
            {loadingOp === 'restore'
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{t.drive.restore}</Text>}
          </Pressable>
          {driveStatus && (
            <View style={[styles.statusBox, driveStatus.startsWith('Error') && styles.statusBoxError]}>
              <Text style={styles.statusText}>{driveStatus}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 20, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  contentDesktop: { paddingHorizontal: 32, paddingVertical: 28 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#8E8E93', marginBottom: 16, lineHeight: 20 },
  button: {
    paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  buttonVcf: { backgroundColor: '#5856D6' },
  buttonExport: { backgroundColor: '#007AFF' },
  buttonImport: { backgroundColor: '#34C759' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonDrive: { backgroundColor: '#1a73e8' },
  buttonDriveRestore: { backgroundColor: '#34A853' },
  statusBox: { marginTop: 8, padding: 12, backgroundColor: '#E8F5E9', borderRadius: 8 },
  statusBoxError: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 14, color: '#333' },
});
