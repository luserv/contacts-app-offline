import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactNote, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  initialNotes: ContactNote[];
}

export default function NotesCard({ contactId, initialNotes }: Props) {
  const { t } = useI18n();
  const { getContactNotes, addContactNote, removeContactNote } = useContacts();

  const [notes, setNotes] = useState<ContactNote[]>(initialNotes);
  const [modalVisible, setModalVisible] = useState(false);
  const [input, setInput] = useState('');

  const openAdd = () => { setInput(''); setModalVisible(true); };

  const handleSave = async () => {
    const trimmed = input.trim();
    if (!trimmed) { Alert.alert(t.common.error, t.notes.required); return; }
    const ok = await addContactNote(contactId, trimmed);
    if (ok) setNotes(await getContactNotes(contactId));
    setModalVisible(false);
  };

  const handleRemove = (note: ContactNote) => {
    Alert.alert(t.notes.deleteTitle, t.notes.deleteConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive', onPress: async () => {
          await removeContactNote(note.id);
          setNotes(prev => prev.filter(n => n.id !== note.id));
        },
      },
    ]);
  };

  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.notes.title}</Text>
          <Pressable style={s.addButton} onPress={openAdd}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {notes.length === 0 ? (
          <Text style={s.emptyText}>{t.notes.empty}</Text>
        ) : (
          notes.map((note, i) => (
            <View key={note.id} style={[styles.row, i === notes.length - 1 && styles.lastRow]}>
              <Text style={styles.noteText}>{note.note}</Text>
              <Pressable onPress={() => handleRemove(note)} style={s.removeBtn} hitSlop={6}>
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
              <Text style={s.modalTitle}>{t.notes.addTitle}</Text>
              <Text style={s.fieldLabel}>
                {t.notes.noteLabel} <Text style={s.required}>{t.common.required}</Text>
              </Text>
              <TextInput
                style={[s.input, styles.textArea]}
                value={input}
                onChangeText={setInput}
                placeholder={t.notes.placeholder}
                placeholderTextColor="#C7C7CC"
                multiline
                numberOfLines={4}
                autoFocus
                textAlignVertical="top"
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
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  lastRow: { borderBottomWidth: 0 },
  noteText: { flex: 1, fontSize: 15, color: '#222', lineHeight: 21 },
  textArea: { minHeight: 100, paddingTop: 10 },
});
