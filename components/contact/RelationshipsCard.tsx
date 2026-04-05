import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Relationship, RelationshipType, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  initialRelationships: Relationship[];
  onNavigate: (contactId: string) => void;
}

export default function RelationshipsCard({ contactId, initialRelationships, onNavigate }: Props) {
  const { t } = useI18n();
  const { getRelationships, addRelationship, removeRelationship, getRelationshipTypes, contacts, fetchContacts } = useContacts();

  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'type' | 'contact'>('type');
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const openModal = async () => {
    const types = await getRelationshipTypes();
    await fetchContacts();
    setRelationshipTypes(types);
    setSelectedTypeId(null);
    setSelectedContactId(null);
    setSearch('');
    setStep('type');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedTypeId || !selectedContactId) return;
    const ok = await addRelationship(contactId, selectedContactId, selectedTypeId);
    if (ok) {
      setRelationships(await getRelationships(contactId));
      setModalVisible(false);
    } else {
      Alert.alert(t.common.error, t.relationships.saveError);
    }
  };

  const handleRemove = (rel: Relationship) => {
    Alert.alert(
      t.relationships.deleteTitle,
      t.relationships.deleteConfirm(`${rel.first_name} ${rel.surname}`, rel.label),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive', onPress: async () => {
            await removeRelationship(rel.id);
            setRelationships(prev => prev.filter(r => r.id !== rel.id));
          },
        },
      ]
    );
  };

  const alreadyRelatedIds = new Set(
    selectedTypeId
      ? relationships.filter(r => r.type_id === selectedTypeId).map(r => r.related_contact_id)
      : []
  );

  const available = contacts.filter(c =>
    c.contact_id !== contactId &&
    !alreadyRelatedIds.has(c.contact_id) &&
    (c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.surname.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.relationships.title}</Text>
          <Pressable style={s.addButton} onPress={openModal}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {relationships.length === 0 ? (
          <Text style={s.emptyText}>{t.relationships.empty}</Text>
        ) : (
          relationships.map(rel => (
            <View key={rel.id} style={styles.relRow}>
              <Pressable style={styles.relAvatar} onPress={() => onNavigate(rel.related_contact_id)}>
                <Text style={styles.relAvatarText}>
                  {rel.first_name?.[0]?.toUpperCase()}{rel.surname?.[0]?.toUpperCase()}
                </Text>
              </Pressable>
              <Pressable style={styles.relInfo} onPress={() => onNavigate(rel.related_contact_id)}>
                <Text style={styles.relName}>{rel.first_name} {rel.surname}</Text>
                <Text style={styles.relType}>{rel.label}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemove(rel)} style={s.removeBtn}>
                <Text style={s.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            {step === 'type' ? (
              <>
                <Text style={s.modalTitle}>{t.relationships.whatRelationship}</Text>
                <FlatList
                  data={relationshipTypes}
                  keyExtractor={item => item.type_id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.optionRow, selectedTypeId === item.type_id && styles.optionRowSelected]}
                      onPress={() => setSelectedTypeId(item.type_id)}
                    >
                      <Text style={[styles.optionText, selectedTypeId === item.type_id && styles.optionTextSelected]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  )}
                />
                <View style={s.modalActions}>
                  <Pressable style={s.btnCancel} onPress={() => setModalVisible(false)}>
                    <Text style={s.btnCancelText}>{t.common.cancel}</Text>
                  </Pressable>
                  <Pressable
                    style={[s.btnSave, !selectedTypeId && s.btnDisabled]}
                    onPress={() => selectedTypeId && setStep('contact')}
                  >
                    <Text style={s.btnSaveText}>{t.common.next}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={s.modalTitle}>{t.relationships.whichContact}</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t.relationships.search}
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#8E8E93"
                />
                <FlatList
                  data={available}
                  keyExtractor={item => item.contact_id}
                  ListEmptyComponent={<Text style={s.emptyText}>{t.common.noContactsAvailable}</Text>}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.optionRow, selectedContactId === item.contact_id && styles.optionRowSelected]}
                      onPress={() => setSelectedContactId(item.contact_id)}
                    >
                      <View style={styles.relAvatarSmall}>
                        <Text style={styles.relAvatarSmallText}>
                          {item.first_name?.[0]?.toUpperCase()}{item.surname?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, selectedContactId === item.contact_id && styles.optionTextSelected]}>
                        {item.first_name} {item.surname}
                      </Text>
                    </Pressable>
                  )}
                />
                <View style={s.modalActions}>
                  <Pressable style={s.btnCancel} onPress={() => setStep('type')}>
                    <Text style={s.btnCancelText}>{t.common.back}</Text>
                  </Pressable>
                  <Pressable
                    style={[s.btnSave, !selectedContactId && s.btnDisabled]}
                    onPress={handleSave}
                  >
                    <Text style={s.btnSaveText}>{t.common.save}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  relRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  relAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#5AC8FA', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  relAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  relInfo: { flex: 1 },
  relName: { fontSize: 16, color: '#000', fontWeight: '500' },
  relType: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  relAvatarSmall: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#5AC8FA', alignItems: 'center', justifyContent: 'center',
  },
  relAvatarSmallText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  searchInput: {
    backgroundColor: '#F2F2F7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, color: '#000', marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 8, marginBottom: 4,
  },
  optionRowSelected: { backgroundColor: '#E5F0FF' },
  optionText: { fontSize: 16, color: '#000', marginLeft: 8 },
  optionTextSelected: { color: '#007AFF', fontWeight: '600' },
});
