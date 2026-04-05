import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Dropdown from '../Dropdown';
import { MaritalStatus, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { ContactDetail, formatDate } from '../../utils/contactUtils';
import { sharedStyles as s } from './contactStyles';

interface Props {
  visible: boolean;
  contact: ContactDetail | null;
  onClose: () => void;
  onSaved: (updated: ContactDetail) => void;
}

export default function EditContactModal({ visible, contact, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const { getMaritalStatuses, updateContact, getContact } = useContacts();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [statusId, setStatusId] = useState<string | null>(null);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatus[]>([]);

  useEffect(() => {
    if (visible && contact) {
      getMaritalStatuses().then(setMaritalStatuses);
      setFirstName(contact.first_name);
      setMiddleName(contact.middle_name ?? '');
      setSurname(contact.surname);
      setBirthdate(contact.birthdate ?? '');
      setGender((contact.gender as 'MALE' | 'FEMALE') ?? null);
      setStatusId(contact.status_id ?? null);
    }
  }, [visible, contact]);

  const handleSave = async () => {
    if (!firstName.trim() || !surname.trim()) {
      Alert.alert(t.common.error, t.contacts.nameRequired);
      return;
    }
    const ok = await updateContact(contact!.contact_id, {
      first_name: firstName.trim(),
      middle_name: middleName.trim() || undefined,
      surname: surname.trim(),
      birthdate: birthdate.trim() || undefined,
      gender: gender ?? undefined,
      status_id: statusId ?? undefined,
    });
    if (ok) {
      const updated = await getContact(contact!.contact_id);
      if (updated) onSaved(updated as ContactDetail);
      onClose();
    } else {
      Alert.alert(t.common.error, t.editContact.saveError);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          <Text style={s.modalTitle}>{t.editContact.title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={s.fieldLabel}>{t.contacts.firstName} <Text style={s.required}>{t.common.required}</Text></Text>
            <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholderTextColor="#C7C7CC" placeholder={t.contacts.firstName} />

            <Text style={s.fieldLabel}>{t.contacts.middleName}</Text>
            <TextInput style={s.input} value={middleName} onChangeText={setMiddleName} placeholderTextColor="#C7C7CC" placeholder={t.contacts.middleName} />

            <Text style={s.fieldLabel}>{t.contacts.surname} <Text style={s.required}>{t.common.required}</Text></Text>
            <TextInput style={s.input} value={surname} onChangeText={setSurname} placeholderTextColor="#C7C7CC" placeholder={t.contacts.surname} />

            <Text style={s.fieldLabel}>{t.contacts.gender}</Text>
            <View style={styles.genderRow}>
              {(['MALE', 'FEMALE'] as const).map(g => (
                <Pressable
                  key={g}
                  style={[styles.genderChip, gender === g && styles.genderChipSelected]}
                  onPress={() => setGender(prev => prev === g ? null : g)}
                >
                  <Text style={[styles.genderChipText, gender === g && styles.genderChipTextSelected]}>
                    {g === 'MALE' ? t.contacts.male : t.contacts.female}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.fieldLabel}>{t.contacts.birthdate}</Text>
            <TextInput
              style={s.input} value={birthdate} onChangeText={v => formatDate(v, setBirthdate)}
              placeholder={t.contacts.birthdatePlaceholder} placeholderTextColor="#C7C7CC"
              keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'} maxLength={10}
            />

            <Text style={s.fieldLabel}>{t.contacts.maritalStatus}</Text>
            <Dropdown
              options={maritalStatuses.map(ms => ({ label: ms.marital_status, value: ms.status_id }))}
              value={statusId}
              onSelect={setStatusId}
              allowNull
            />

          </ScrollView>

          <View style={s.modalActions}>
            <Pressable style={s.btnCancel} onPress={onClose}>
              <Text style={s.btnCancelText}>{t.common.cancel}</Text>
            </Pressable>
            <Pressable style={s.btnSave} onPress={handleSave}>
              <Text style={s.btnSaveText}>{t.common.save}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#C7C7CC', alignItems: 'center', backgroundColor: '#F9F9F9',
  },
  genderChipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  genderChipText: { fontSize: 15, color: '#333' },
  genderChipTextSelected: { color: '#fff', fontWeight: '600' },
});
