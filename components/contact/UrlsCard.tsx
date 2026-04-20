import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactUrl, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  initialUrls: ContactUrl[];
}

export default function UrlsCard({ contactId, initialUrls }: Props) {
  const { t } = useI18n();
  const { getContactUrls, addContactUrl, removeContactUrl } = useContacts();

  const [urls, setUrls] = useState<ContactUrl[]>(initialUrls);
  const [modalVisible, setModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');

  const openAdd = () => { setUrlInput(''); setLabelInput(''); setModalVisible(true); };

  const handleSave = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) { Alert.alert(t.common.error, t.urls.required); return; }
    const ok = await addContactUrl(contactId, trimmedUrl, labelInput.trim() || undefined);
    if (ok) setUrls(await getContactUrls(contactId));
    setModalVisible(false);
  };

  const handleOpen = (url: string) => {
    const target = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(target).catch(() => Alert.alert(t.common.error, t.urls.openError));
  };

  const handleRemove = (item: ContactUrl) => {
    Alert.alert(t.urls.deleteTitle, t.urls.deleteConfirm(item.url), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive', onPress: async () => {
          await removeContactUrl(item.id);
          setUrls(prev => prev.filter(u => u.id !== item.id));
        },
      },
    ]);
  };

  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.urls.title}</Text>
          <Pressable style={s.addButton} onPress={openAdd}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {urls.length === 0 ? (
          <Text style={s.emptyText}>{t.urls.empty}</Text>
        ) : (
          urls.map((item, i) => (
            <View key={item.id} style={[styles.row, i === urls.length - 1 && styles.lastRow]}>
              <View style={styles.info}>
                {item.label ? <Text style={styles.label}>{item.label}</Text> : null}
                <Pressable onPress={() => handleOpen(item.url)}>
                  <Text style={styles.urlText} numberOfLines={1}>{item.url}</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => handleRemove(item)} style={s.removeBtn} hitSlop={6}>
                <Text style={s.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalContainer}>
              <Text style={s.modalTitle}>{t.urls.addTitle}</Text>

              <Text style={s.fieldLabel}>
                {t.urls.urlLabel} <Text style={s.required}>{t.common.required}</Text>
              </Text>
              <TextInput
                style={s.input}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder={t.urls.urlPlaceholder}
                placeholderTextColor="#C7C7CC"
                autoCapitalize="none"
                keyboardType="url"
                autoFocus
              />

              <Text style={s.fieldLabel}>{t.urls.labelField}</Text>
              <TextInput
                style={s.input}
                value={labelInput}
                onChangeText={setLabelInput}
                placeholder={t.urls.labelPlaceholder}
                placeholderTextColor="#C7C7CC"
              />

              <View style={s.modalActions}>
                <Pressable style={s.btnCancel} onPress={() => setModalVisible(false)}>
                  <Text style={s.btnCancelText}>{t.common.cancel}</Text>
                </Pressable>
                <Pressable style={s.btnSave} onPress={handleSave}>
                  <Text style={s.btnSaveText}>{t.common.save}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  lastRow: { borderBottomWidth: 0 },
  info: { flex: 1 },
  label: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  urlText: { fontSize: 15, color: '#007AFF' },
});
