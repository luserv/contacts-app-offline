import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ArrowDownUp, Plus, RefreshCw, Search, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AdBanner from '../../components/AdBanner';
import Dropdown from '../../components/Dropdown';
import { MaritalStatus, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { displayName, edadEnFecha, getZodiacSymbol } from '../../utils/contactUtils';
import { rescheduleExpiredBirthdayNotifications } from '../../utils/notifications';

const DOC_TYPES = ['Pasaporte', 'Cédula', 'Licencia de conducir', 'Otro'];

interface Contact {
  contact_id: string;
  [key: string]: any;
}

type SortKey = 'first_name' | 'surname' | 'age_asc' | 'age_desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'first_name', label: 'Nombre (A-Z)' },
  { key: 'surname',    label: 'Apellido (A-Z)' },
  { key: 'age_desc',   label: 'Edad (mayor → menor)' },
  { key: 'age_asc',    label: 'Edad (menor → mayor)' },
];

function parseBirthdateToAge(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

function formatFullAge(birthdate?: string | null): string | null {
  if (!birthdate) return null;
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const today = new Date();
  let years = today.getFullYear() - y;
  let months = today.getMonth() + 1 - m;
  let days = today.getDate() - d;
  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts2: string[] = [];
  if (years > 0) parts2.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) parts2.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0) parts2.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  return parts2.length > 0 ? parts2.join(', ') : '0 días';
}

type SearchFilter =
  | { type: 'age'; op: 'eq' | 'gt' | 'lt' | 'gte' | 'lte'; value: number }
  | { type: 'text'; value: string };

function parseSearchFilter(query: string): SearchFilter {
  const trimmed = query.trim();
  // age:23  age:>23  age:<23  age:>=23  age:<=23
  const m = trimmed.match(/^age:(>=|<=|>|<)?(\d+)$/i);
  if (m) {
    const opStr = m[1] ?? '';
    const value = parseInt(m[2]);
    const op = opStr === '>=' ? 'gte' : opStr === '<=' ? 'lte' : opStr === '>' ? 'gt' : opStr === '<' ? 'lt' : 'eq';
    return { type: 'age', op, value };
  }
  return { type: 'text', value: trimmed };
}

type AgeOp = Extract<SearchFilter, { type: 'age' }>['op'];

function applyAgeFilter(contacts: Contact[], op: AgeOp, value: number): Contact[] {
  return contacts.filter(c => {
    const age = parseBirthdateToAge(c.birthdate);
    if (age === null) return false;
    if (op === 'eq')  return age === value;
    if (op === 'gt')  return age > value;
    if (op === 'lt')  return age < value;
    if (op === 'gte') return age >= value;
    if (op === 'lte') return age <= value;
    return false;
  });
}

function birthdateToSortKey(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const parts = birthdate.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return y * 10000 + m * 100 + d;
}

function sortContacts(list: Contact[], key: SortKey): Contact[] {
  return [...list].sort((a, b) => {
    if (key === 'first_name') return a.first_name.localeCompare(b.first_name);
    if (key === 'surname')    return a.surname.localeCompare(b.surname);
    const kA = birthdateToSortKey(a.birthdate);
    const kB = birthdateToSortKey(b.birthdate);
    if (kA === null && kB === null) return 0;
    if (kA === null) return 1;
    if (kB === null) return -1;
    return key === 'age_desc' ? kA - kB : kB - kA;
  });
}

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('first_name');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'MALE' | 'FEMALE' | null>(null);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatus[]>([]);

  const [hasDoc, setHasDoc] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [cardNumber, setCardNumber] = useState('');

  const router = useRouter();
  const { contacts, fetchContacts, createContact, getMaritalStatuses, addIdentityCard, searchContacts } = useContacts();
  const { t } = useI18n();

  const [searchResults, setSearchResults] = React.useState<Contact[]>([]);

  React.useEffect(() => {
    fetchContacts().then(loaded => {
      rescheduleExpiredBirthdayNotifications(loaded);
    });
  }, [fetchContacts]);

  const chips = React.useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return trimmed.split('&').map(p => p.trim()).filter(Boolean).map(part => {
      const f = parseSearchFilter(part);
      if (f.type === 'age') {
        const opLabel = f.op === 'eq' ? '' : f.op === 'gt' ? '>' : f.op === 'lt' ? '<' : f.op === 'gte' ? '≥' : '≤';
        return `Edad ${opLabel}${opLabel ? ' ' : ''}${f.value}`;
      }
      return part;
    });
  }, [searchQuery]);

  React.useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchResults([]); return; }

    const parts = trimmed.split('&').map(p => p.trim()).filter(Boolean);
    const timer = setTimeout(async () => {
      const resultSets: Contact[][] = await Promise.all(
        parts.map(part => {
          const f = parseSearchFilter(part);
          if (f.type === 'age') return Promise.resolve(applyAgeFilter(contacts, f.op, f.value));
          return searchContacts(part);
        })
      );
      if (resultSets.length === 0) { setSearchResults([]); return; }
      const idSets = resultSets.map(r => new Set(r.map((c: Contact) => c.contact_id)));
      setSearchResults(resultSets[0].filter((c: Contact) => idSets.every(s => s.has(c.contact_id))));
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, searchContacts, contacts]);

  const handleRefresh = React.useCallback(async () => {
    await fetchContacts();
  }, [fetchContacts]);

  useFocusEffect(useCallback(() => {
    fetchContacts();
    setModalVisible(false);
    setSortModalVisible(false);
  }, []));

  const baseContacts = searchQuery.trim() ? searchResults : contacts;
  const filteredContacts = sortContacts(
    genderFilter ? baseContacts.filter(c => c.gender === genderFilter) : baseContacts,
    sortKey
  );

  const formatBirthdate = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setBirthdate(formatted);
  };

  const handleOpenModal = async () => {
    const statuses = await getMaritalStatuses();
    setMaritalStatuses(statuses);
    setFirstName('');
    setMiddleName('');
    setSurname('');
    setBirthdate('');
    setGender(null);
    setSelectedStatusId(null);
    setHasDoc(false);
    setDocType(DOC_TYPES[0]);
    setCardNumber('');
    setModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!firstName.trim() || !surname.trim()) {
      alert(t.contacts.nameRequired);
      return;
    }

    try {
      const newContact = await createContact({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        surname: surname.trim(),
        birthdate: birthdate.trim() || undefined,
        gender: gender ?? undefined,
        status_id: selectedStatusId ?? undefined,
      });

      if (newContact) {
        if (hasDoc && cardNumber.trim()) {
          await addIdentityCard(newContact.contact_id, docType, cardNumber.trim());
        }
        setModalVisible(false);
        await fetchContacts();
        router.push(`/contact/${newContact.contact_id}`);
      } else {
        alert(t.contacts.createError);
      }
    } catch (error) {
      alert(t.common.error + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        headerTitle: t.tabs.contacts,
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 16, marginRight: 16 }}>
            <Pressable onPress={handleRefresh}>
              <RefreshCw size={22} color="#007AFF" />
            </Pressable>
            <Pressable onPress={() => setSortModalVisible(true)}>
              <ArrowDownUp size={22} color="#007AFF" />
            </Pressable>
          </View>
        ),
      }} />

      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`${t.contacts.search}  (age:23)`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={20} color="#8E8E93" />
          </Pressable>
        )}
      </View>

      {chips.length > 0 && (
        <View style={styles.activeFilterRow}>
          {chips.map((chip, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Text style={styles.chipAnd}>&amp;</Text>}
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{chip}</Text>
              </View>
            </React.Fragment>
          ))}
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.chipClear}>
            <X size={14} color="#FF3B30" />
          </Pressable>
        </View>
      )}

      <View style={styles.filterRow}>
        {([null, 'MALE', 'FEMALE'] as const).map(g => (
          <Pressable
            key={String(g)}
            style={[styles.filterChip, genderFilter === g && styles.filterChipActive]}
            onPress={() => setGenderFilter(g)}
          >
            <Text style={[styles.filterChipText, genderFilter === g && styles.filterChipTextActive]}>
              {g === null ? t.contacts.all : g === 'MALE' ? t.contacts.male : t.contacts.female}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.contactCount}>
        {filteredContacts.length} {filteredContacts.length === 1 ? 'contacto' : 'contactos'}
      </Text>

      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.contact_id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.contactItem}
              onPress={() => router.push(`/contact/${item.contact_id}`)}
            >
              <View style={styles.avatar}>
                {getZodiacSymbol(item.birthdate) ? (
                  <Text style={styles.avatarZodiac}>{getZodiacSymbol(item.birthdate)}</Text>
                ) : (
                  <Text style={styles.avatarText}>
                    {item.first_name?.[0]?.toUpperCase()}
                    {item.surname?.[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{displayName(item)}</Text>
                {(sortKey === 'age_asc' || sortKey === 'age_desc') && (
                  <Text style={styles.contactAge}>
                    {formatFullAge(item.birthdate) ?? 'Edad no registrada'}
                  </Text>
                )}
                {searchQuery.trim() && (item.achievement || item.organization_name) ? (
                  <>
                    {item.achievement ? (
                      <Text style={styles.contactAchievement}>{item.achievement}</Text>
                    ) : null}
                    {item.organization_name ? (
                      <Text style={styles.contactAchievementOrg}>{item.organization_name}</Text>
                    ) : null}
                    {item.organization_date ? (
                      <Text style={styles.contactAchievementDate}>
                        {item.organization_date}
                        {(() => {
                          if (!item.birthdate) return '';
                          const e = edadEnFecha(item.birthdate, item.organization_date);
                          if (!e) return '';
                          const parts = [];
                          if (e.years > 0) parts.push(`${e.years} ${e.years === 1 ? 'año' : 'años'}`);
                          if (e.months > 0) parts.push(`${e.months} ${e.months === 1 ? 'mes' : 'meses'}`);
                          if (e.days > 0) parts.push(`${e.days} ${e.days === 1 ? 'día' : 'días'}`);
                          return parts.length ? ` · ${parts.join(', ')}` : '';
                        })()}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t.contacts.empty}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />

        <Pressable style={styles.fab} onPress={handleOpenModal}>
          <Plus size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <AdBanner />

      {/* Modal de ordenación */}
      <Modal
        animationType="fade"
        transparent
        visible={sortModalVisible}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortModalVisible(false)}>
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Ordenar por</Text>
            {SORT_OPTIONS.map(opt => (
              <Pressable
                key={opt.key}
                style={styles.sortOption}
                onPress={() => { setSortKey(opt.key); setSortModalVisible(false); }}
              >
                <Text style={[styles.sortOptionText, sortKey === opt.key && styles.sortOptionActive]}>
                  {opt.label}
                </Text>
                {sortKey === opt.key && <Text style={styles.sortCheck}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t.contacts.newContact}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.fieldLabel}>{t.contacts.firstName} <Text style={styles.required}>{t.common.required}</Text></Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.firstNamePlaceholder}
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor="#C7C7CC"
              />

              <Text style={styles.fieldLabel}>{t.contacts.middleName}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.middleNamePlaceholder}
                value={middleName}
                onChangeText={setMiddleName}
                placeholderTextColor="#C7C7CC"
              />

              <Text style={styles.fieldLabel}>{t.contacts.surname} <Text style={styles.required}>{t.common.required}</Text></Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.surnamePlaceholder}
                value={surname}
                onChangeText={setSurname}
                placeholderTextColor="#C7C7CC"
              />

              <Text style={styles.fieldLabel}>{t.contacts.gender}</Text>
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

              <Text style={styles.fieldLabel}>{t.contacts.birthdate}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.birthdatePlaceholder}
                value={birthdate}
                onChangeText={formatBirthdate}
                placeholderTextColor="#C7C7CC"
                keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                maxLength={10}
              />

              <Text style={styles.fieldLabel}>{t.contacts.maritalStatus}</Text>
              <Dropdown
                options={maritalStatuses.map(s => ({ label: s.marital_status, value: s.status_id }))}
                value={selectedStatusId}
                onSelect={setSelectedStatusId}
                allowNull
              />

              {/* Documento de identidad */}
              <Pressable style={styles.docToggle} onPress={() => setHasDoc(v => !v)}>
                <View style={[styles.docToggleBox, hasDoc && styles.docToggleBoxActive]}>
                  {hasDoc && <Text style={styles.docToggleCheck}>✓</Text>}
                </View>
                <Text style={styles.docToggleLabel}>{t.contacts.hasDoc}</Text>
              </Pressable>

              {hasDoc && (
                <>
                  <Text style={styles.fieldLabel}>{t.contacts.docType}</Text>
                  <Dropdown
                    options={DOC_TYPES.map(d => ({ label: d, value: d }))}
                    value={docType}
                    onSelect={v => v && setDocType(v)}
                  />

                  <Text style={styles.fieldLabel}>{t.contacts.docNumber}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.contacts.docNumberPlaceholder}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholderTextColor="#C7C7CC"
                    autoCapitalize="characters"
                  />
                </>
              )}

            </ScrollView>

            <View style={styles.buttonContainer}>
              <Pressable style={[styles.button, styles.buttonCancel]} onPress={() => setModalVisible(false)}>
                <Text style={styles.textCancel}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.buttonSave]} onPress={handleSaveContact}>
                <Text style={styles.textSave}>{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 2, marginHorizontal: 16, marginVertical: 10, height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },

  activeFilterRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 4, marginTop: -4, gap: 6,
  },
  activeFilterChip: {
    backgroundColor: '#E5F0FF', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#007AFF40',
  },
  activeFilterText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  chipAnd: { fontSize: 12, color: '#8E8E93', fontWeight: '700' },
  chipClear: { padding: 2 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#C7C7CC', backgroundColor: '#F9F9F9',
  },
  filterChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  contactCount: { fontSize: 13, color: '#8E8E93', marginHorizontal: 16, marginBottom: 4 },
  listContent: { paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#8E8E93' },

  contactItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc',
  },
  contactInfo: { flex: 1, justifyContent: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginTop: 2,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  avatarZodiac: { fontSize: 22 },
  contactName: { fontSize: 17, color: '#000' },
  contactAge: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  contactAchievement: { fontSize: 13, color: '#007AFF', marginTop: 2 },
  contactAchievementOrg: { fontSize: 13, color: '#007AFF', fontWeight: '700' },
  contactAchievementDate: { fontSize: 12, color: '#5A9EE0', marginTop: 1 },

  fab: {
    position: 'absolute', right: 16, bottom: 32,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },

  sortModal: {
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 32,
    marginTop: 'auto', marginBottom: 'auto', padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  sortModalTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textAlign: 'center', paddingVertical: 10 },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8 },
  sortOptionText: { fontSize: 16, color: '#000' },
  sortOptionActive: { color: '#007AFF', fontWeight: '600' },
  sortCheck: { color: '#007AFF', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#000',
    textAlign: 'center', marginBottom: 20,
  },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  required: { color: '#FF3B30' },
  input: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, color: '#000', backgroundColor: '#F9F9F9',
  },

  docToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  docToggleBox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  docToggleBoxActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  docToggleCheck: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  docToggleLabel: { fontSize: 15, color: '#333' },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#C7C7CC', alignItems: 'center', backgroundColor: '#F9F9F9',
  },
  genderChipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  genderChipText: { fontSize: 15, color: '#333' },
  genderChipTextSelected: { color: '#fff', fontWeight: '600' },


  buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 24 },
  button: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonCancel: { backgroundColor: '#E5E5EA' },
  buttonSave: { backgroundColor: '#007AFF' },
  textCancel: { fontSize: 16, fontWeight: '600', color: '#000' },
  textSave: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
