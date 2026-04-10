import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactBankAccount, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  initialAccounts: ContactBankAccount[];
}

export default function BankAccountCard({ contactId, initialAccounts }: Props) {
  const { t } = useI18n();
  const { getBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, searchBanks, searchAccountTypes } = useContacts();

  const [accounts, setAccounts] = useState<ContactBankAccount[]>(initialAccounts);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [bankName, setBankName] = useState('');
  const [bankSuggestions, setBankSuggestions] = useState<string[]>([]);

  const [accountNumber, setAccountNumber] = useState('');

  const [accountType, setAccountType] = useState('');
  const [typeSuggestions, setTypeSuggestions] = useState<string[]>([]);

  const [label, setLabel] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setBankName('');
    setBankSuggestions([]);
    setAccountNumber('');
    setAccountType('');
    setTypeSuggestions([]);
    setLabel('');
    setModalVisible(true);
  };

  const openEditModal = (acc: ContactBankAccount) => {
    setEditingId(acc.id);
    setBankName(acc.bank_name ?? '');
    setBankSuggestions([]);
    setAccountNumber(acc.account_number);
    setAccountType(acc.account_type ?? '');
    setTypeSuggestions([]);
    setLabel(acc.label ?? '');
    setModalVisible(true);
  };

  const handleBankNameChange = async (text: string) => {
    setBankName(text);
    if (text.trim().length >= 1) {
      const results = await searchBanks(text.trim());
      setBankSuggestions(results.filter(r => r !== text.trim().toUpperCase()));
    } else {
      setBankSuggestions([]);
    }
  };

  const handleAccountTypeChange = async (text: string) => {
    setAccountType(text);
    if (text.trim().length >= 1) {
      const results = await searchAccountTypes(text.trim());
      setTypeSuggestions(results.filter(r => r.toLowerCase() !== text.trim().toLowerCase()));
    } else {
      setTypeSuggestions([]);
    }
  };

  const handleSave = async () => {
    if (!accountNumber.trim()) {
      Alert.alert(t.common.error, t.bankAccounts.accountNumberRequired);
      return;
    }
    const ok = editingId !== null
      ? await updateBankAccount(editingId, accountNumber.trim(), bankName.trim() || undefined, accountType.trim() || undefined, label.trim() || undefined)
      : await addBankAccount(contactId, accountNumber.trim(), bankName.trim() || undefined, accountType.trim() || undefined, label.trim() || undefined);
    if (ok) {
      setAccounts(await getBankAccounts(contactId));
      setModalVisible(false);
    } else {
      Alert.alert(t.common.error, t.bankAccounts.saveError);
    }
  };

  const handleRemove = (acc: ContactBankAccount) => {
    Alert.alert(
      t.bankAccounts.deleteTitle,
      t.bankAccounts.deleteConfirm(acc.account_number),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive', onPress: async () => {
            await deleteBankAccount(acc.id);
            setAccounts(prev => prev.filter(a => a.id !== acc.id));
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.bankAccounts.title}</Text>
          <Pressable style={s.addButton} onPress={openAddModal}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {accounts.length === 0 ? (
          <Text style={s.emptyText}>{t.bankAccounts.empty}</Text>
        ) : (
          accounts.map(acc => (
            <View key={acc.id} style={styles.row}>
              <View style={styles.info}>
                {acc.bank_name ? <Text style={styles.bankName}>{acc.bank_name}</Text> : null}
                <Text style={styles.accountNumber}>{acc.account_number}</Text>
                {acc.account_type ? <Text style={styles.meta}>{acc.account_type}</Text> : null}
                {acc.label ? <Text style={styles.meta}>{acc.label}</Text> : null}
              </View>
              <Pressable onPress={() => openEditModal(acc)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemove(acc)} style={s.removeBtn}>
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
              <Text style={s.modalTitle}>{editingId !== null ? t.common.edit : t.bankAccounts.addTitle}</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={s.fieldLabel}>{t.bankAccounts.bankName}</Text>
              <TextInput
                style={s.input} value={bankName} onChangeText={handleBankNameChange}
                placeholder={t.bankAccounts.bankNamePlaceholder} placeholderTextColor="#C7C7CC"
                autoCapitalize="characters" autoFocus
              />
              {bankSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {bankSuggestions.map(sg => (
                    <Pressable key={sg} style={styles.suggestionRow} onPress={() => { setBankName(sg); setBankSuggestions([]); }}>
                      <Text style={styles.suggestionText}>{sg}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={s.fieldLabel}>
                {t.bankAccounts.accountNumber} <Text style={s.required}>{t.common.required}</Text>
              </Text>
              <TextInput
                style={s.input} value={accountNumber} onChangeText={setAccountNumber}
                placeholder="0000-0000-0000-0000" placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
              />

              <Text style={s.fieldLabel}>{t.bankAccounts.accountType}</Text>
              <TextInput
                style={s.input} value={accountType} onChangeText={handleAccountTypeChange}
                placeholder={t.bankAccounts.accountTypePlaceholder} placeholderTextColor="#C7C7CC"
              />
              {typeSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {typeSuggestions.map(sg => (
                    <Pressable key={sg} style={styles.suggestionRow} onPress={() => { setAccountType(sg); setTypeSuggestions([]); }}>
                      <Text style={styles.suggestionText}>{sg}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={s.fieldLabel}>{t.bankAccounts.label}</Text>
              <TextInput
                style={s.input} value={label} onChangeText={setLabel}
                placeholder={t.bankAccounts.labelPlaceholder} placeholderTextColor="#C7C7CC"
              />

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
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  info: { flex: 1 },
  bankName: { fontSize: 12, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  accountNumber: { fontSize: 16, color: '#000', fontWeight: '500' },
  meta: { fontSize: 13, color: '#555', marginTop: 2 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  editBtnText: { fontSize: 14, color: '#007AFF' },
  suggestions: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8,
    backgroundColor: '#fff', marginTop: 4, marginBottom: 4,
  },
  suggestionRow: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7',
  },
  suggestionText: { fontSize: 15, color: '#007AFF' },
});
