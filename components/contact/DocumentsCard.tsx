import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Dropdown from '../Dropdown';
import { IdentityCard, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { DOC_TYPES, DOCS_WITH_DATES, formatDate } from '../../utils/contactUtils';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  initialCards: IdentityCard[];
}

export default function DocumentsCard({ contactId, initialCards }: Props) {
  const { t } = useI18n();
  const { getIdentityCards, addIdentityCard, updateIdentityCard, deleteIdentityCard } = useContacts();

  const [cards, setCards] = useState<IdentityCard[]>(initialCards);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [cardNumber, setCardNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setDocType(DOC_TYPES[0]);
    setCardNumber('');
    setIssueDate('');
    setExpiryDate('');
    setModalVisible(true);
  };

  const openEditModal = (doc: IdentityCard) => {
    setEditingId(doc.id);
    setDocType(doc.doc_type);
    setCardNumber(doc.card_number);
    setIssueDate(doc.issue_date ?? '');
    setExpiryDate(doc.expiry_date ?? '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!cardNumber.trim()) {
      Alert.alert(t.common.error, t.documents.numberRequired);
      return;
    }
    const ok = editingId !== null
      ? await updateIdentityCard(editingId, docType, cardNumber.trim(), issueDate.trim() || undefined, expiryDate.trim() || undefined)
      : await addIdentityCard(contactId, docType, cardNumber.trim(), issueDate.trim() || undefined, expiryDate.trim() || undefined);
    if (ok) {
      setCards(await getIdentityCards(contactId));
      setModalVisible(false);
    } else {
      Alert.alert(t.common.error, docType === 'Cédula' ? t.documents.cedularError : t.documents.saveError);
    }
  };

  const handleRemove = (doc: IdentityCard) => {
    Alert.alert(
      t.documents.deleteTitle,
      t.documents.deleteConfirm(doc.doc_type, doc.card_number),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive', onPress: async () => {
            await deleteIdentityCard(doc.id);
            setCards(prev => prev.filter(d => d.id !== doc.id));
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.documents.title}</Text>
          <Pressable style={s.addButton} onPress={openAddModal}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {cards.length === 0 ? (
          <Text style={s.emptyText}>{t.documents.empty}</Text>
        ) : (
          cards.map(doc => (
            <View key={doc.id} style={styles.docRow}>
              <View style={styles.docInfo}>
                <Text style={styles.docType}>{doc.doc_type}</Text>
                <Text style={styles.docNumber}>{doc.card_number}</Text>
                {doc.issue_date ? <Text style={styles.docDate}>{t.documents.issuedLabel} {doc.issue_date}</Text> : null}
                {doc.expiry_date ? <Text style={styles.docDate}>{t.documents.expiryLabel} {doc.expiry_date}</Text> : null}
              </View>
              <Pressable onPress={() => openEditModal(doc)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemove(doc)} style={s.removeBtn}>
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
              <Text style={s.modalTitle}>{editingId !== null ? t.common.edit : t.documents.addTitle}</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>{t.documents.docType}</Text>
              <Dropdown
                options={DOC_TYPES.map(d => ({ label: d, value: d }))}
                value={docType}
                onSelect={v => v && setDocType(v)}
              />

              <Text style={s.fieldLabel}>{t.documents.number} <Text style={s.required}>{t.common.required}</Text></Text>
              <TextInput
                style={s.input} value={cardNumber} onChangeText={setCardNumber}
                placeholder={t.documents.number} placeholderTextColor="#C7C7CC"
                autoCapitalize="characters"
              />

              {DOCS_WITH_DATES.includes(docType) && (
                <>
                  <Text style={s.fieldLabel}>{t.documents.issueDate}</Text>
                  <TextInput
                    style={s.input} value={issueDate}
                    onChangeText={v => formatDate(v, setIssueDate)}
                    placeholder={t.contacts.birthdatePlaceholder} placeholderTextColor="#C7C7CC"
                    keyboardType="numeric" maxLength={10}
                  />
                  <Text style={s.fieldLabel}>{t.documents.expiryDate}</Text>
                  <TextInput
                    style={s.input} value={expiryDate}
                    onChangeText={v => formatDate(v, setExpiryDate)}
                    placeholder={t.contacts.birthdatePlaceholder} placeholderTextColor="#C7C7CC"
                    keyboardType="numeric" maxLength={10}
                  />
                </>
              )}
            </ScrollView>

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
  docRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  docInfo: { flex: 1 },
  docType: { fontSize: 12, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  docNumber: { fontSize: 16, color: '#000', fontWeight: '500' },
  docDate: { fontSize: 13, color: '#555', marginTop: 2 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  editBtnText: { fontSize: 14, color: '#007AFF' },
});
