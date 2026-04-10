import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactOrganization, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { edadEnFecha, formatDate } from '../../utils/contactUtils';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  birthdate?: string;
  initialOrganizations: ContactOrganization[];
}

export default function OrganizationsCard({ contactId, birthdate, initialOrganizations }: Props) {
  const { t } = useI18n();
  const { getContactOrganizations, addContactOrganization, updateContactOrganization, removeContactOrganization, searchOrganizations, searchAchievements } = useContacts();

  const [organizations, setOrganizations] = useState<ContactOrganization[]>(initialOrganizations);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [orgName, setOrgName] = useState('');
  const [achievement, setAchievement] = useState('');
  const [date, setDate] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [achievementSuggestions, setAchievementSuggestions] = useState<string[]>([]);

  const openAddModal = () => {
    setEditingId(null);
    setOrgName('');
    setAchievement('');
    setDate('');
    setSuggestions([]);
    setAchievementSuggestions([]);
    setModalVisible(true);
  };

  const openEditModal = (org: ContactOrganization) => {
    setEditingId(org.id);
    setOrgName(org.organization_name);
    setAchievement(org.achievement);
    setDate(org.date ?? '');
    setSuggestions([]);
    setAchievementSuggestions([]);
    setModalVisible(true);
  };

  const handleNameChange = async (text: string) => {
    setOrgName(text);
    if (text.trim().length >= 2) {
      const results = await searchOrganizations(text.trim());
      setSuggestions(results.map(r => r.name).filter(n => n !== text));
    } else {
      setSuggestions([]);
    }
  };

  const handleAchievementChange = async (text: string) => {
    setAchievement(text);
    if (text.trim().length >= 2) {
      const results = await searchAchievements(text.trim());
      setAchievementSuggestions(results.filter(a => a !== text));
    } else {
      setAchievementSuggestions([]);
    }
  };

  const handleSave = async () => {
    if (!orgName.trim()) {
      Alert.alert(t.common.error, t.organizations.orgNameRequired);
      return;
    }

    const ok = editingId !== null
      ? await updateContactOrganization(editingId, orgName.trim(), achievement.trim(), date.trim() || undefined)
      : await addContactOrganization(contactId, orgName.trim(), achievement.trim(), date.trim() || undefined);

    if (ok) {
      setOrganizations(await getContactOrganizations(contactId));
      setModalVisible(false);
    } else {
      Alert.alert(t.common.error, t.organizations.saveError);
    }
  };

  const handleRemove = (org: ContactOrganization) => {
    Alert.alert(
      t.organizations.deleteTitle,
      t.organizations.deleteConfirm(org.organization_name),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive', onPress: async () => {
            await removeContactOrganization(org.id);
            setOrganizations(prev => prev.filter(o => o.id !== org.id));
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.organizations.title}</Text>
          <Pressable style={s.addButton} onPress={openAddModal}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {organizations.length === 0 ? (
          <Text style={s.emptyText}>{t.organizations.empty}</Text>
        ) : (
          organizations.map(org => (
            <View key={org.id} style={styles.orgRow}>
              <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{org.organization_name}</Text>
                {org.achievement ? <Text style={styles.orgAchievement}>{org.achievement}</Text> : null}
                {org.date ? (
                  <Text style={styles.orgDate}>
                    {org.date}
                    {(() => {
                      if (!birthdate) return '';
                      const e = edadEnFecha(birthdate, org.date);
                      if (!e) return '';
                      const parts = [];
                      if (e.years > 0) parts.push(`${e.years} ${e.years === 1 ? 'año' : 'años'}`);
                      if (e.months > 0) parts.push(`${e.months} ${e.months === 1 ? 'mes' : 'meses'}`);
                      if (e.days > 0) parts.push(`${e.days} ${e.days === 1 ? 'día' : 'días'}`);
                      return parts.length ? ` · ${parts.join(', ')}` : '';
                    })()}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => openEditModal(org)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemove(org)} style={s.removeBtn}>
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
            <Text style={s.modalTitle}>
              {editingId !== null ? t.common.edit : t.organizations.addTitle}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>{t.organizations.orgName} <Text style={s.required}>{t.common.required}</Text></Text>
              <TextInput
                style={s.input} value={orgName} onChangeText={handleNameChange}
                placeholder={t.organizations.orgName} placeholderTextColor="#C7C7CC"
              />
              {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {suggestions.map((sg, i) => (
                    <Pressable key={`${i}-${sg}`} style={styles.suggestionRow} onPress={() => { setOrgName(sg); setSuggestions([]); }}>
                      <Text style={styles.suggestionText}>{sg}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={s.fieldLabel}>{t.organizations.achievement}</Text>
              <TextInput
                style={s.input} value={achievement} onChangeText={handleAchievementChange}
                placeholder={t.organizations.achievementPlaceholder} placeholderTextColor="#C7C7CC"
              />
              {achievementSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {achievementSuggestions.map((sg, i) => (
                    <Pressable key={`${i}-${sg}`} style={styles.suggestionRow} onPress={() => { setAchievement(sg); setAchievementSuggestions([]); }}>
                      <Text style={styles.suggestionText}>{sg}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={s.fieldLabel}>{t.organizations.date}</Text>
              <TextInput
                style={s.input} value={date}
                onChangeText={v => formatDate(v, setDate)}
                placeholder={t.contacts.birthdatePlaceholder} placeholderTextColor="#C7C7CC"
                keyboardType="numeric" maxLength={10}
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
  orgRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  orgInfo: { flex: 1 },
  orgName: { fontSize: 16, fontWeight: '600', color: '#000' },
  orgAchievement: { fontSize: 14, color: '#333', marginTop: 2 },
  orgDate: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
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
