import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ArrowDownUp, Filter, Plus, RefreshCw, Search, X } from 'lucide-react-native';
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
import {
  applyAgeFilter,
  CedulaFilter,
  ContactListItem,
  DOC_TYPES,
  filterContactsByCedula,
  filterContactsByGender,
  filterContactsByMaritalStatus,
  filterContactsByOrganization,
  formatFullAge,
  GenderFilter,
  getGenderFilterOptions,
  getSearchChips,
  MaritalStatusFilter,
  OrganizationFilter,
  parseSearchFilter,
  sortContacts,
  SortKey,
  SORT_OPTIONS,
} from '../../utils/contactList';
import { getContactIdsWithCedula } from '../../utils/cedulaFilter';
import {
  getAllOrganizations,
  getContactIdsByOrganization,
  getContactIdsWithOrganization,
} from '../../utils/organizationFilter';
import { MaritalStatus, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { edadEnFecha } from '../../utils/contactUtils';
import { rescheduleExpiredBirthdayNotifications } from '../../utils/notifications';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('first_name');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(null);
  const [birthdateFilter, setBirthdateFilter] = useState<'all' | 'with' | 'without'>('all');
  const [cedulaFilter, setCedulaFilter] = useState<CedulaFilter>({ mode: 'all' });
  const [cedulaIds, setCedulaIds] = useState<Set<string>>(new Set());
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilter>({ mode: 'all' });
  const [orgIds, setOrgIds] = useState<Set<string>>(new Set());
  const [specificOrgIds, setSpecificOrgIds] = useState<Set<string>>(new Set());
  const [organizations, setOrganizations] = useState<{ organization_id: string; name: string }[]>([]);
  const [maritalStatusFilter, setMaritalStatusFilter] = useState<MaritalStatusFilter>({ mode: 'all' });

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

  const [searchResults, setSearchResults] = React.useState<ContactListItem[]>([]);
  const genderFilterOptions = React.useMemo(() => getGenderFilterOptions(t), [t]);

  React.useEffect(() => {
    fetchContacts().then(loaded => {
      rescheduleExpiredBirthdayNotifications(loaded);
    });
  }, [fetchContacts]);

  const refreshCedulaIds = React.useCallback(async () => {
    const ids = await getContactIdsWithCedula();
    setCedulaIds(ids);
  }, []);

  const refreshOrganizationData = React.useCallback(async () => {
    const [ids, orgs] = await Promise.all([
      getContactIdsWithOrganization(),
      getAllOrganizations(),
    ]);
    setOrgIds(ids);
    setOrganizations(orgs);
  }, []);

  React.useEffect(() => {
    getMaritalStatuses().then(setMaritalStatuses);
  }, [getMaritalStatuses]);

  React.useEffect(() => {
    refreshCedulaIds();
    refreshOrganizationData();
  }, [refreshCedulaIds, refreshOrganizationData, contacts]);

  React.useEffect(() => {
    if (organizationFilter.mode !== 'specific' || !organizationFilter.organizationId) {
      setSpecificOrgIds(new Set());
      return;
    }
    let cancelled = false;
    getContactIdsByOrganization(organizationFilter.organizationId).then(ids => {
      if (!cancelled) setSpecificOrgIds(ids);
    });
    return () => { cancelled = true; };
  }, [organizationFilter, contacts]);

  const chips = React.useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return getSearchChips(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchResults([]); return; }

    const parts = trimmed.split('&').map(p => p.trim()).filter(Boolean);
    const timer = setTimeout(async () => {
      const resultSets: ContactListItem[][] = await Promise.all(
        parts.map(part => {
          const f = parseSearchFilter(part);
          if (f.type === 'age') return Promise.resolve(applyAgeFilter(contacts, f.op, f.value));
          return searchContacts(part);
        })
      );
      if (resultSets.length === 0) { setSearchResults([]); return; }
      const idSets = resultSets.map(r => new Set(r.map((c: ContactListItem) => c.contact_id)));
      setSearchResults(resultSets[0].filter((c: ContactListItem) => idSets.every(s => s.has(c.contact_id))));
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, searchContacts, contacts]);

  const handleRefresh = React.useCallback(async () => {
    await fetchContacts();
    await refreshCedulaIds();
    await refreshOrganizationData();
  }, [fetchContacts, refreshCedulaIds, refreshOrganizationData]);

  useFocusEffect(useCallback(() => {
    fetchContacts();
    setModalVisible(false);
    setSortModalVisible(false);
  }, []));

  const baseContacts = searchQuery.trim() ? searchResults : contacts;
  const genderFiltered = filterContactsByGender(baseContacts, genderFilter);
  const birthdateFiltered = birthdateFilter === 'all'
    ? genderFiltered
    : genderFiltered.filter(c => {
      const hasBirthdate = !!(c.birthdate && String(c.birthdate).trim());
      return birthdateFilter === 'with' ? hasBirthdate : !hasBirthdate;
    });
  const cedulaFiltered = filterContactsByCedula(birthdateFiltered, cedulaFilter, cedulaIds);
  const organizationFiltered = filterContactsByOrganization(cedulaFiltered, organizationFilter, orgIds, specificOrgIds);
  const maritalFiltered = filterContactsByMaritalStatus(organizationFiltered, maritalStatusFilter);
  const filteredContacts = sortContacts(maritalFiltered, sortKey);

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
            <Pressable onPress={() => setFilterModalVisible(true)}>
              <Filter size={22} color="#007AFF" />
            </Pressable>
            <Pressable onPress={() => setSortModalVisible(true)}>
              <ArrowDownUp size={22} color="#007AFF" />
            </Pressable>
          </View>
        ),
      }} />

      <View style={styles.filtersPanel}>
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

      </View>

      <Text style={styles.contactCount}>
        {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
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
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>
                  {`${item.first_name ?? ''} ${item.middle_name ?? ''} ${item.surname ?? ''}`.replace(/\s+/g, ' ').trim()}
                </Text>
                {(sortKey === 'age_asc' || sortKey === 'age_desc') && (
                  <Text style={styles.contactAge}>
                    {formatFullAge(item.birthdate) ?? 'Age not recorded'}
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
                          if (e.years > 0) parts.push(`${e.years} ${e.years === 1 ? 'year' : 'years'}`);
                          if (e.months > 0) parts.push(`${e.months} ${e.months === 1 ? 'month' : 'months'}`);
                          if (e.days > 0) parts.push(`${e.days} ${e.days === 1 ? 'day' : 'days'}`);
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
            <Text style={styles.sortModalTitle}>Sort by</Text>
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

      {/* Modal de filtros */}
      <Modal
        animationType="fade"
        transparent
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Filters</Text>

            <Text style={styles.filterSectionTitle}>{t.contacts.gender}</Text>
            <View style={styles.filterSectionChips}>
              {genderFilterOptions.map(option => (
                <Pressable
                  key={String(option.value)}
                  style={[styles.filterChip, genderFilter === option.value && styles.filterChipActive]}
                  onPress={() => setGenderFilter(option.value)}
                >
                  <Text style={[styles.filterChipText, genderFilter === option.value && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterSectionTitle, { marginTop: 12 }]}>{t.contacts.birthdate}</Text>
            <View style={styles.filterSectionChips}>
              {([
                { key: 'all', label: t.contacts.birthdateAll },
                { key: 'with', label: t.contacts.birthdateWith },
                { key: 'without', label: t.contacts.birthdateWithout },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, birthdateFilter === opt.key && styles.filterChipActive]}
                  onPress={() => setBirthdateFilter(opt.key)}
                >
                  <Text style={[styles.filterChipText, birthdateFilter === opt.key && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterSectionTitle, { marginTop: 12 }]}>{t.contacts.docFilter}</Text>
            <View style={styles.filterSectionChips}>
              {([
                { key: 'all', label: t.contacts.all },
                { key: 'with', label: t.contacts.docFilterWith },
                { key: 'without', label: t.contacts.docFilterWithout },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, cedulaFilter.mode === opt.key && styles.filterChipActive]}
                  onPress={() => setCedulaFilter({ mode: opt.key })}
                >
                  <Text style={[styles.filterChipText, cedulaFilter.mode === opt.key && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterSectionTitle, { marginTop: 12 }]}>{t.contacts.orgFilter}</Text>
            <View style={styles.filterSectionChips}>
              {([
                { key: 'all', label: t.contacts.all },
                { key: 'with', label: t.contacts.orgFilterWith },
                { key: 'without', label: t.contacts.orgFilterWithout },
                { key: 'specific', label: t.contacts.orgFilterSpecific },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, organizationFilter.mode === opt.key && styles.filterChipActive]}
                  onPress={() => setOrganizationFilter(prev => ({
                    mode: opt.key,
                    organizationId: opt.key === 'specific' ? prev.organizationId : undefined,
                  }))}
                >
                  <Text style={[styles.filterChipText, organizationFilter.mode === opt.key && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {organizationFilter.mode === 'specific' && (
              <View style={styles.orgPickerWrapper}>
                <Dropdown
                  options={organizations.map(o => ({ label: o.name, value: o.organization_id }))}
                  value={organizationFilter.organizationId ?? null}
                  onSelect={(val) => setOrganizationFilter({
                    mode: 'specific',
                    organizationId: val ?? undefined,
                  })}
                  placeholder={t.contacts.orgFilterSelectPlaceholder}
                />
              </View>
            )}

            <Text style={[styles.filterSectionTitle, { marginTop: 12 }]}>{t.contacts.maritalFilter}</Text>
            <View style={styles.filterSectionChips}>
              {([
                { key: 'all', label: t.contacts.all },
                { key: 'with', label: t.contacts.maritalFilterWith },
                { key: 'without', label: t.contacts.maritalFilterWithout },
                { key: 'specific', label: t.contacts.maritalFilterSpecific },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, maritalStatusFilter.mode === opt.key && styles.filterChipActive]}
                  onPress={() => setMaritalStatusFilter(prev => ({
                    mode: opt.key,
                    statusId: opt.key === 'specific' ? prev.statusId : undefined,
                  }))}
                >
                  <Text style={[styles.filterChipText, maritalStatusFilter.mode === opt.key && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {maritalStatusFilter.mode === 'specific' && (
              <View style={styles.orgPickerWrapper}>
                <Dropdown
                  options={maritalStatuses.map(s => ({ label: s.marital_status, value: s.status_id }))}
                  value={maritalStatusFilter.statusId ?? null}
                  onSelect={(val) => setMaritalStatusFilter({
                    mode: 'specific',
                    statusId: val ?? undefined,
                  })}
                  placeholder={t.contacts.maritalFilterSelectPlaceholder}
                />
              </View>
            )}
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

  filtersPanel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 12, minHeight: 52,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#000',
    margin: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 52,
  },

  activeFilterRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    marginTop: 10, gap: 6,
  },
  activeFilterChip: {
    backgroundColor: '#E5F0FF', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#007AFF40',
  },
  activeFilterText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  chipAnd: { fontSize: 12, color: '#8E8E93', fontWeight: '700' },
  chipClear: { padding: 2 },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#C7C7CC', backgroundColor: '#F9F9F9',
  },
  filterChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  contactCount: { fontSize: 13, color: '#8E8E93', marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  listContent: { paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#8E8E93' },

  contactItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc',
  },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 17, color: '#000' },
  contactZodiacDesc: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
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

  filterSectionTitle: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginTop: 6, marginBottom: 8, paddingHorizontal: 12 },
  filterSectionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 6 },
  orgPickerWrapper: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },

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
