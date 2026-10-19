import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdBanner from '../../components/AdBanner';
import Dropdown from '../../components/Dropdown';
import {
  applyAgeFilter,
  CedulaFilter,
  ContactListItem,
  DOC_TYPES,
  DOC_TYPES_KEYS,
  filterContactsByCedula,
  filterContactsByGender,
  filterContactsByMaritalStatus,
  filterContactsByOrganization,
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
import { useTheme } from '../../utils/theme';
import { useI18n } from '../../utils/i18n';
import { listLabel } from '../../utils/listLabels';
import { useResponsive } from '../../utils/responsive';
import { calcularEdad, edadEnFecha } from '../../utils/contactUtils';
import { rescheduleExpiredBirthdayNotifications } from '../../utils/notifications';

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#30B0C7',
  '#007AFF', '#5856D6', '#BF5AF2', '#FF2D55', '#AC8E68',
];

function getAvatarColor(name: string): string {
  if (!name) return '#8E8E93';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function InitialsAvatar({ firstName, surname, size = 44 }: { firstName?: string | null; surname?: string | null; size?: number }) {
  const initials = [firstName?.[0], surname?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const bg = getAvatarColor(`${firstName ?? ''}${surname ?? ''}`);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: Math.round(size * 0.38), fontWeight: '600', letterSpacing: 0.5 }}>{initials}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
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
  const [docType, setDocType] = useState<string>(DOC_TYPES[0]);
  const [cardNumber, setCardNumber] = useState('');

  const router = useRouter();
  const { contacts, contactsLoading, fetchContacts, createContact, getMaritalStatuses, addIdentityCard, searchContacts } = useContacts();
  const { t, lang } = useI18n();
  const { isDesktop, isTablet, r } = useResponsive();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [searchResults, setSearchResults] = React.useState<ContactListItem[]>([]);
  // Query the current results belong to; differs from searchQuery while the debounced search runs.
  const [settledQuery, setSettledQuery] = React.useState('');
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

  const showChips = React.useMemo(
    () => searchQuery.split('&').filter(p => p.trim()).length > 1 || parseSearchFilter(searchQuery).type === 'age',
    [searchQuery],
  );

  // Web: Ctrl/Cmd+K focuses the search field
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const chips = React.useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return getSearchChips(searchQuery, t.contacts.searchAgeLabel);
  }, [searchQuery, t.contacts.searchAgeLabel]);

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
      if (resultSets.length === 0) { setSearchResults([]); setSettledQuery(trimmed); return; }
      const idSets = resultSets.map(r => new Set(r.map((c: ContactListItem) => c.contact_id)));
      setSearchResults(resultSets[0].filter((c: ContactListItem) => idSets.every(s => s.has(c.contact_id))));
      setSettledQuery(trimmed);
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

  const sections = React.useMemo(() => {
    if (filteredContacts.length === 0) return [];
    const isAgeSort = sortKey === 'age_asc' || sortKey === 'age_desc';
    const isInsertionSort = sortKey === 'insertion_asc' || sortKey === 'insertion_desc';
    if (isAgeSort || isInsertionSort) return [{ title: '', data: filteredContacts }];
    const map = new Map<string, ContactListItem[]>();
    for (const c of filteredContacts) {
      const letter = sortKey === 'surname'
        ? (c.surname?.[0]?.toUpperCase() ?? '#')
        : (c.first_name?.[0]?.toUpperCase() ?? '#');
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredContacts, sortKey]);

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{
        headerTitle: t.tabs.contacts,
        headerLargeTitle: true,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 20, marginRight: 12 }}>
            <Pressable onPress={handleRefresh} hitSlop={8} accessibilityLabel={t.common.refresh}>
              <Ionicons name="refresh" size={20} color={colors.accent} />
            </Pressable>
            <Pressable onPress={() => setFilterModalVisible(true)} hitSlop={8} accessibilityLabel={t.contactList.filters}>
              <Ionicons name="filter" size={20} color={colors.accent} />
            </Pressable>
            <Pressable onPress={() => setSortModalVisible(true)} hitSlop={8} accessibilityLabel={t.contactList.sortBy}>
              <Ionicons name="swap-vertical" size={20} color={colors.accent} />
            </Pressable>
          </View>
        ),
      }} />

      <View style={styles.innerWrap}>
        {/* Search bar */}
        <View style={[styles.searchWrap, isDesktop && styles.searchWrapDesktop, { backgroundColor: colors.bg }]}>
          <View style={[styles.searchContainer, isDesktop && styles.searchContainerDesktop, { backgroundColor: colors.fill, borderColor: searchFocused ? colors.accent : 'transparent' }]}>
            <Ionicons name="search" size={16} color={colors.placeholder} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyPress={(e) => { if (e.nativeEvent.key === 'Escape') setSearchQuery(''); }}
              autoCorrect={false}
              spellCheck={false}
              accessibilityRole="search"
              accessibilityLabel={t.contacts.search}
              accessibilityHint={t.contacts.searchA11yHint}
              placeholder={t.contacts.searchHint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel={t.common.clearSearch} onPress={() => setSearchQuery('')} hitSlop={8} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>

        {showChips && chips.length > 0 && (
          <View style={[styles.activeFilterRow, isDesktop && styles.activeFilterRowDesktop]}>
            {chips.map((chip, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={[styles.chipAnd, { color: colors.textSecondary }]}>&amp;</Text>}
                <View style={[styles.activeFilterChip, { backgroundColor: colors.accentSubtle }]}>
                  <Text style={[styles.activeFilterText, { color: colors.accent }]}>{chip}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        <Text style={[styles.contactCount, isDesktop && styles.contactCountDesktop, { color: colors.textSecondary }]}>
          {filteredContacts.length} {filteredContacts.length === 1 ? t.contactList.contact : t.contactList.contacts}
        </Text>

        <View style={{ flex: 1 }}>
          {contactsLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.contact_id}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section: { title } }) =>
              title ? (
                <View style={[styles.sectionHeader, { backgroundColor: colors.bg }, isDesktop && styles.sectionHeaderDesktop, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{title}</Text>
                </View>
              ) : null
            }
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, isTablet && !isDesktop && styles.separatorTablet, isDesktop && styles.separatorDesktop, { backgroundColor: colors.separatorFine }]} />
            )}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.contactItem,
                  isTablet && !isDesktop && styles.contactItemTablet,
                  isDesktop && styles.contactItemDesktop,
                  { backgroundColor: pressed ? colors.bg : colors.surface },
                ]}
                onPress={() => router.push(`/contact/${item.contact_id}`)}
              >
                <InitialsAvatar firstName={item.first_name} surname={item.surname} size={r(44, 46, 48)} />
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, isDesktop && styles.contactNameDesktop, { color: colors.text }]} numberOfLines={1}>
                    {`${item.first_name ?? ''} ${item.middle_name ?? ''} ${item.surname ?? ''}`.replace(/\s+/g, ' ').trim()}
                  </Text>
                  {(sortKey === 'age_asc' || sortKey === 'age_desc') && (
                    <Text style={[styles.contactSecondary, { color: colors.textSecondary }]}>
                      {calcularEdad(item.birthdate, t.age) ?? t.contactList.ageNotRecorded}
                    </Text>
                  )}
                  {searchQuery.trim() && (item.achievement || item.organization_name) ? (
                    <>
                      {item.achievement ? (
                        <Text style={[styles.contactSecondaryBlue, { color: colors.accent }]}>{item.achievement}</Text>
                      ) : null}
                      {item.organization_name ? (
                        <Text style={[styles.contactSecondaryBlue, { color: colors.accent }, { fontWeight: '600' }]}>{item.organization_name}</Text>
                      ) : null}
                      {item.organization_date ? (
                        <Text style={[styles.contactSecondaryLight, { color: colors.accent }]}>
                          {item.organization_date}
                          {(() => {
                            if (!item.birthdate) return '';
                            const e = edadEnFecha(item.birthdate, item.organization_date);
                            if (!e) return '';
                            const parts = [];
                            if (e.years > 0) parts.push(`${e.years} ${e.years === 1 ? t.contactList.year : t.contactList.years}`);
                            if (e.months > 0) parts.push(`${e.months} ${e.months === 1 ? t.contactList.month : t.contactList.months}`);
                            if (e.days > 0) parts.push(`${e.days} ${e.days === 1 ? t.contactList.day : t.contactList.days}`);
                            return parts.length ? ` · ${parts.join(', ')}` : '';
                          })()}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </Pressable>
            )}
            ListEmptyComponent={() => searchQuery.trim() && settledQuery !== searchQuery.trim() ? null : (
              <View style={styles.emptyContainer}>
                {contacts.length > 0 ? (
                  <>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.contacts.noResults}</Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.contacts.noResultsHint}</Text>
                    {searchQuery.length > 0 && (
                      <Pressable accessibilityRole="button" onPress={() => setSearchQuery('')} style={styles.emptyAction}>
                        <Text style={[styles.emptyActionText, { color: colors.accent }]}>{t.common.clearSearch}</Text>
                      </Pressable>
                    )}
                  </>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.contacts.empty}</Text>
                )}
              </View>
            )}
            contentContainerStyle={[styles.listContent, isDesktop && styles.listContentDesktop]}
          />

          <Pressable style={[styles.fab, isDesktop && styles.fabDesktop, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={handleOpenModal} accessibilityLabel={t.contacts.newContact}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <AdBanner />

      {/* Sort modal */}
      <Modal
        animationType="fade"
        transparent
        visible={sortModalVisible}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setSortModalVisible(false)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.actionSheetTitle, { color: colors.textSecondary }]}>{t.contactList.sortBy}</Text>
            {SORT_OPTIONS.map((opt, i) => (
              <React.Fragment key={opt.key}>
                {i > 0 && <View style={styles.actionSheetSeparator} />}
                <Pressable
                  style={({ pressed }) => [styles.actionSheetItem, pressed && { backgroundColor: '#F2F2F7' }]}
                  onPress={() => { setSortKey(opt.key); setSortModalVisible(false); }}
                >
                  <Text style={[styles.actionSheetItemText, { color: colors.text }, sortKey === opt.key && [styles.actionSheetItemActive, { color: colors.accent }]]}>
                    {(t.contactList as any)[opt.transKey]}
                  </Text>
                  {sortKey === opt.key && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Filter modal */}
      <Modal
        animationType="fade"
        transparent
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setFilterModalVisible(false)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.actionSheetTitle, { color: colors.textSecondary }]}>{t.contactList.filters}</Text>

            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>{t.contacts.gender}</Text>
            <View style={styles.filterChipRow}>
              {genderFilterOptions.map(option => (
                <Pressable
                  key={String(option.value)}
                  style={[styles.filterChip, genderFilter === option.value && [styles.filterChipActive, { borderColor: colors.accent }, { backgroundColor: colors.accent }]]}
                  onPress={() => setGenderFilter(option.value)}
                >
                  <Text style={[styles.filterChipText, genderFilter === option.value && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }, { marginTop: 12 }]}>{t.contacts.birthdate}</Text>
            <View style={styles.filterChipRow}>
              {([
                { key: 'all', label: t.contacts.birthdateAll },
                { key: 'with', label: t.contacts.birthdateWith },
                { key: 'without', label: t.contacts.birthdateWithout },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, birthdateFilter === opt.key && [styles.filterChipActive, { borderColor: colors.accent }, { backgroundColor: colors.accent }]]}
                  onPress={() => setBirthdateFilter(opt.key)}
                >
                  <Text style={[styles.filterChipText, birthdateFilter === opt.key && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }, { marginTop: 12 }]}>{t.contacts.docFilter}</Text>
            <View style={styles.filterChipRow}>
              {([
                { key: 'all', label: t.contacts.all },
                { key: 'with', label: t.contacts.docFilterWith },
                { key: 'without', label: t.contacts.docFilterWithout },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, cedulaFilter.mode === opt.key && [styles.filterChipActive, { borderColor: colors.accent }, { backgroundColor: colors.accent }]]}
                  onPress={() => setCedulaFilter({ mode: opt.key })}
                >
                  <Text style={[styles.filterChipText, cedulaFilter.mode === opt.key && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }, { marginTop: 12 }]}>{t.contacts.orgFilter}</Text>
            <View style={styles.filterChipRow}>
              {([
                { key: 'all', label: t.contacts.all },
                { key: 'with', label: t.contacts.orgFilterWith },
                { key: 'without', label: t.contacts.orgFilterWithout },
                { key: 'specific', label: t.contacts.orgFilterSpecific },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, organizationFilter.mode === opt.key && [styles.filterChipActive, { borderColor: colors.accent }, { backgroundColor: colors.accent }]]}
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

            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }, { marginTop: 12 }]}>{t.contacts.maritalFilter}</Text>
            <View style={styles.filterChipRow}>
              {([
                { key: 'all', label: t.contacts.all },
                { key: 'with', label: t.contacts.maritalFilterWith },
                { key: 'without', label: t.contacts.maritalFilterWithout },
                { key: 'specific', label: t.contacts.maritalFilterSpecific },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterChip, maritalStatusFilter.mode === opt.key && [styles.filterChipActive, { borderColor: colors.accent }, { backgroundColor: colors.accent }]]}
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
                  options={maritalStatuses.map(s => ({ label: listLabel('marital', lang, s.status_id, s.marital_status), value: s.status_id }))}
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

      {/* New contact sheet */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
        <View style={[styles.sheetOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.bg }, isDesktop ? styles.sheetDesktop : { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t.contacts.newContact}</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.firstName} <Text style={[styles.required, { color: colors.destructive }]}>{t.common.required}</Text></Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder={t.contacts.firstNamePlaceholder}
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.middleName}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder={t.contacts.middleNamePlaceholder}
                value={middleName}
                onChangeText={setMiddleName}
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.surname} <Text style={[styles.required, { color: colors.destructive }]}>{t.common.required}</Text></Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder={t.contacts.surnamePlaceholder}
                value={surname}
                onChangeText={setSurname}
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.gender}</Text>
              <View style={styles.genderRow}>
                {(['MALE', 'FEMALE'] as const).map(g => (
                  <Pressable
                    key={g}
                    style={[styles.genderChip, gender === g && [styles.genderChipSelected, { backgroundColor: colors.accent }]]}
                    onPress={() => setGender(prev => prev === g ? null : g)}
                  >
                    <Text style={[styles.genderChipText, gender === g && styles.genderChipTextSelected]}>
                      {g === 'MALE' ? t.contacts.male : t.contacts.female}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.birthdate}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder={t.contacts.birthdatePlaceholder}
                value={birthdate}
                onChangeText={formatBirthdate}
                placeholderTextColor={colors.placeholder}
                keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                maxLength={10}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.maritalStatus}</Text>
              <Dropdown
                options={maritalStatuses.map(s => ({ label: listLabel('marital', lang, s.status_id, s.marital_status), value: s.status_id }))}
                value={selectedStatusId}
                onSelect={setSelectedStatusId}
                allowNull
              />

              <Pressable style={styles.docToggle} onPress={() => setHasDoc(v => !v)}>
                <View style={[styles.docToggleBox, hasDoc && [styles.docToggleBoxActive, { borderColor: colors.accent }, { backgroundColor: colors.accent }]]}>
                  {hasDoc && <Ionicons name="checkmark" size={14} color={colors.surface} />}
                </View>
                <Text style={styles.docToggleLabel}>{t.contacts.hasDoc}</Text>
              </Pressable>

              {hasDoc && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.docType}</Text>
                  <Dropdown
                    options={DOC_TYPES.map((d, i) => ({ label: (t.contactList as any)[DOC_TYPES_KEYS[i]], value: d }))}
                    value={docType}
                    onSelect={v => v && setDocType(v)}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.contacts.docNumber}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder={t.contacts.docNumberPlaceholder}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="characters"
                  />
                </>
              )}

            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable style={[styles.btn, styles.btnCancel, { backgroundColor: colors.surface }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.btnCancelText, { color: colors.text }]}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnSave, { backgroundColor: colors.accent }]} onPress={handleSaveContact}>
                <Text style={styles.btnSaveText}>{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  innerWrap: {
    flex: 1,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  // Search
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchWrapDesktop: { paddingHorizontal: 32 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    borderWidth: 2,
  },
  searchContainerDesktop: { maxWidth: 600 },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearBtn: {
    marginLeft: 6,
    marginRight: -6,
    padding: 8,
  },

  // Filter chips row
  activeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 6,
  },
  activeFilterRowDesktop: { marginHorizontal: 32 },
  activeFilterChip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeFilterText: { fontSize: 13, fontWeight: '600' },
  chipAnd: { fontSize: 12, fontWeight: '700' },

  // Count
  contactCount: { fontSize: 12, marginHorizontal: 16, marginBottom: 4 },
  contactCountDesktop: { marginHorizontal: 32 },

  // Section headers
  sectionHeader: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60,60,67,0.15)',
  },
  sectionHeaderDesktop: { paddingHorizontal: 32 },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C6C70',
    letterSpacing: 0.5,
  },

  // Row separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.15)',
    marginLeft: 72,
  },
  separatorTablet: { marginLeft: 78 },
  separatorDesktop: { marginLeft: 100 },

  // Contact row
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: '#fff',
    minHeight: 60,
    gap: 12,
  },
  contactItemTablet: {
    paddingLeft: 20,
    paddingRight: 20,
    minHeight: 62,
  },
  contactItemDesktop: {
    paddingLeft: 32,
    paddingRight: 32,
    minHeight: 64,
  },
  contactItemPressed: { backgroundColor: '#F2F2F7' },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 17, color: '#000', letterSpacing: -0.2 },
  contactNameDesktop: { fontSize: 18 },
  contactSecondary: { fontSize: 13, color: '#6C6C70', marginTop: 1 },
  contactSecondaryBlue: { fontSize: 13, color: '#0066D6', marginTop: 1 },
  contactSecondaryLight: { fontSize: 12, color: '#0066D6', marginTop: 1 },

  // List
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  listContent: { paddingBottom: 100 },
  listContentDesktop: { paddingBottom: 120 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptyText: { fontSize: 16, color: '#6C6C70', textAlign: 'center', paddingHorizontal: 24 },
  emptyAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, marginTop: 8 },
  emptyActionText: { fontSize: 16, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 32,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  fabDesktop: { right: 32, width: 60, height: 60, borderRadius: 30 },

  // Action sheet (sort / filter modals)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  actionSheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 24,
    padding: 0,
    minWidth: 280,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  actionSheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C6C70',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60,60,67,0.15)',
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionSheetSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.15)',
    marginHorizontal: 16,
  },
  actionSheetItemText: { fontSize: 17, color: '#000' },
  actionSheetItemActive: { color: '#0066D6', fontWeight: '600' },

  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C6C70',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(60,60,67,0.2)',
    backgroundColor: '#F9F9F9',
  },
  filterChipActive: { backgroundColor: '#0066D6', borderColor: '#0066D6' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  orgPickerWrapper: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },

  // Sheet (new contact modal)
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  sheetDesktop: {
    maxWidth: 600,
    borderRadius: 14,
    alignSelf: 'center',
    marginBottom: 40,
    width: '100%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(60,60,67,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6C6C70', marginTop: 16, marginBottom: 6, letterSpacing: 0.2 },
  required: { color: '#FF3B30' },
  input: {
    borderWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: '#000',
    backgroundColor: '#fff',
    minHeight: 48,
  },

  docToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12 },
  docToggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(60,60,67,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  docToggleBoxActive: { backgroundColor: '#0066D6', borderColor: '#0066D6' },
  docToggleLabel: { fontSize: 15, color: '#000' },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#fff',
  },
  genderChipSelected: { backgroundColor: '#0066D6' },
  genderChipText: { fontSize: 15, color: '#333' },
  genderChipTextSelected: { color: '#fff', fontWeight: '600' },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#fff' },
  btnSave: { backgroundColor: '#0066D6' },
  btnCancelText: { fontSize: 16, fontWeight: '600', color: '#000' },
  btnSaveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
