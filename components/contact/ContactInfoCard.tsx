import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactEmail, ContactPhone, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  initialPhones: ContactPhone[];
  initialEmails: ContactEmail[];
}

export default function ContactInfoCard({ contactId, initialPhones, initialEmails }: Props) {
  const { t } = useI18n();
  const { getContactPhones, addContactPhone, updateContactPhone, removeContactPhone, getContactEmails, addContactEmail, updateContactEmail, removeContactEmail } = useContacts();

  const [phones, setPhones] = useState<ContactPhone[]>(initialPhones);
  const [emails, setEmails] = useState<ContactEmail[]>(initialEmails);

  const [phoneModal, setPhoneModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [editingPhoneId, setEditingPhoneId] = useState<number | null>(null);
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLabelInput, setPhoneLabelInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailLabelInput, setEmailLabelInput] = useState('');

  const openAddPhoneModal = () => {
    setEditingPhoneId(null);
    setPhoneInput('');
    setPhoneLabelInput('');
    setPhoneModal(true);
  };

  const openEditPhoneModal = (p: ContactPhone) => {
    setEditingPhoneId(p.id);
    setPhoneInput(p.phone);
    setPhoneLabelInput(p.label ?? '');
    setPhoneModal(true);
  };

  const openAddEmailModal = () => {
    setEditingEmailId(null);
    setEmailInput('');
    setEmailLabelInput('');
    setEmailModal(true);
  };

  const openEditEmailModal = (e: ContactEmail) => {
    setEditingEmailId(e.id);
    setEmailInput(e.email);
    setEmailLabelInput(e.label ?? '');
    setEmailModal(true);
  };

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) {
      Alert.alert(t.common.error, t.contactInfo.phoneRequired);
      return;
    }
    const ok = editingPhoneId !== null
      ? await updateContactPhone(editingPhoneId, phoneInput.trim(), phoneLabelInput.trim() || undefined)
      : await addContactPhone(contactId, phoneInput.trim(), phoneLabelInput.trim() || undefined);
    if (ok) {
      setPhones(await getContactPhones(contactId));
      setPhoneModal(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!emailInput.trim()) {
      Alert.alert(t.common.error, t.contactInfo.emailRequired);
      return;
    }
    const ok = editingEmailId !== null
      ? await updateContactEmail(editingEmailId, emailInput.trim(), emailLabelInput.trim() || undefined)
      : await addContactEmail(contactId, emailInput.trim(), emailLabelInput.trim() || undefined);
    if (ok) {
      setEmails(await getContactEmails(contactId));
      setEmailModal(false);
    }
  };

  const handleRemovePhone = (p: ContactPhone) => {
    Alert.alert(t.contactInfo.deletePhone, t.contactInfo.deletePhoneConfirm(p.phone), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive', onPress: async () => {
          await removeContactPhone(p.id);
          setPhones(prev => prev.filter(x => x.id !== p.id));
        },
      },
    ]);
  };

  const handleRemoveEmail = (e: ContactEmail) => {
    Alert.alert(t.contactInfo.deleteEmail, t.contactInfo.deleteEmailConfirm(e.email), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive', onPress: async () => {
          await removeContactEmail(e.id);
          setEmails(prev => prev.filter(x => x.id !== e.id));
        },
      },
    ]);
  };

  return (
    <>
      <View style={s.card}>
        {/* Teléfonos */}
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.contactInfo.phones}</Text>
          <Pressable style={s.addButton} onPress={openAddPhoneModal}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {phones.length === 0 ? (
          <Text style={s.emptyText}>{t.contactInfo.emptyPhones}</Text>
        ) : (
          phones.map(p => (
            <View key={p.id} style={styles.row}>
              <Pressable style={styles.info} onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                {p.label ? <Text style={styles.label}>{p.label}</Text> : null}
                <Text style={styles.phoneValue}>{p.phone}</Text>
              </Pressable>
              <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                <Text style={styles.callBtnText}>📞 {t.contactInfo.call}</Text>
              </Pressable>
              <Pressable onPress={() => openEditPhoneModal(p)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemovePhone(p)} style={s.removeBtn}>
                <Text style={s.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))
        )}

        {/* Separador */}
        <View style={styles.sectionDivider} />

        {/* Correos */}
        <View style={[s.cardHeader, { marginTop: 8 }]}>
          <Text style={s.cardTitle}>{t.contactInfo.emails}</Text>
          <Pressable style={s.addButton} onPress={openAddEmailModal}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {emails.length === 0 ? (
          <Text style={s.emptyText}>{t.contactInfo.emptyEmails}</Text>
        ) : (
          emails.map(e => (
            <View key={e.id} style={styles.row}>
              <Pressable style={styles.info} onPress={() => Linking.openURL(`mailto:${e.email}`)}>
                {e.label ? <Text style={styles.label}>{e.label}</Text> : null}
                <Text style={styles.value}>{e.email}</Text>
              </Pressable>
              <Pressable onPress={() => openEditEmailModal(e)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemoveEmail(e)} style={s.removeBtn}>
                <Text style={s.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Modal teléfono */}
      <Modal visible={phoneModal} animationType="slide" transparent onRequestClose={() => setPhoneModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>{editingPhoneId !== null ? t.common.edit : t.contactInfo.addPhone}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>{t.contacts.phone} <Text style={s.required}>{t.common.required}</Text></Text>
              <TextInput
                style={s.input} value={phoneInput} onChangeText={setPhoneInput}
                placeholder={t.contacts.phonePlaceholder} placeholderTextColor="#C7C7CC"
                keyboardType="phone-pad" autoFocus
              />
              <Text style={s.fieldLabel}>{t.contactInfo.phoneLabel}</Text>
              <TextInput
                style={s.input} value={phoneLabelInput} onChangeText={setPhoneLabelInput}
                placeholder="Celular" placeholderTextColor="#C7C7CC"
              />
            </ScrollView>
            <View style={s.modalActions}>
              <Pressable style={s.btnCancel} onPress={() => setPhoneModal(false)}>
                <Text style={s.btnCancelText}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={s.btnSave} onPress={handleSavePhone}>
                <Text style={s.btnSaveText}>{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal correo */}
      <Modal visible={emailModal} animationType="slide" transparent onRequestClose={() => setEmailModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>{editingEmailId !== null ? t.common.edit : t.contactInfo.addEmail}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>{t.contacts.email} <Text style={s.required}>{t.common.required}</Text></Text>
              <TextInput
                style={s.input} value={emailInput} onChangeText={setEmailInput}
                placeholder={t.contacts.emailPlaceholder} placeholderTextColor="#C7C7CC"
                keyboardType="email-address" autoCapitalize="none" autoFocus
              />
              <Text style={s.fieldLabel}>{t.contactInfo.emailLabel}</Text>
              <TextInput
                style={s.input} value={emailLabelInput} onChangeText={setEmailLabelInput}
                placeholder="Personal" placeholderTextColor="#C7C7CC"
              />
            </ScrollView>
            <View style={s.modalActions}>
              <Pressable style={s.btnCancel} onPress={() => setEmailModal(false)}>
                <Text style={s.btnCancelText}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={s.btnSave} onPress={handleSaveEmail}>
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
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  info: { flex: 1 },
  label: { fontSize: 11, color: '#8E8E93', marginBottom: 2 },
  phoneValue: { fontSize: 17, color: '#007AFF', fontWeight: '500' },
  value: { fontSize: 16, color: '#000' },
  callBtn: {
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: '#E5F0FF', borderRadius: 8, marginRight: 6,
  },
  callBtnText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  editBtn: { paddingHorizontal: 8, paddingVertical: 8, marginRight: 2 },
  editBtnText: { fontSize: 14, color: '#007AFF' },
  sectionDivider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 12 },
});
