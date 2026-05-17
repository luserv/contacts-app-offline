import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabBar from '../../components/BottomTabBar';
import BankAccountCard from '../../components/contact/BankAccountCard';
import ContactInfoCard from '../../components/contact/ContactInfoCard';
import DetailInfoRow from '../../components/contact/DetailInfoRow';
import KeywordsCard from '../../components/contact/KeywordsCard';
import DocumentsCard from '../../components/contact/DocumentsCard';
import EditContactModal from '../../components/contact/EditContactModal';
import NotesCard from '../../components/contact/NotesCard';
import OrganizationsCard from '../../components/contact/OrganizationsCard';
import RelationshipsCard from '../../components/contact/RelationshipsCard';
import UrlsCard from '../../components/contact/UrlsCard';
import { ContactBankAccount, ContactEmail, ContactKeyword, ContactNote, ContactOrganization, ContactPhone, ContactUrl, IdentityCard, Relationship, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { useResponsive } from '../../utils/responsive';
import { calcularEdad, ContactDetail, displayName, EXCLUDED_FIELDS, formatBirthdate, getZodiacKey, getZodiacSymbol } from '../../utils/contactUtils';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const contactId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { t, lang } = useI18n();
  const { isDesktop, r } = useResponsive();
  const { getContact, getIdentityCards, getRelationships, getContactOrganizations, getContactPhones, getContactEmails, getContactKeywords, getBankAccounts, getContactNotes, getContactUrls, fetchContacts, deleteContact } = useContacts();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [identityCards, setIdentityCards] = useState<IdentityCard[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [organizations, setOrganizations] = useState<ContactOrganization[]>([]);
  const [phones, setPhones] = useState<ContactPhone[]>([]);
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [keywords, setKeywords] = useState<ContactKeyword[]>([]);
  const [bankAccounts, setBankAccounts] = useState<ContactBankAccount[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [contactUrls, setContactUrls] = useState<ContactUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    const doDelete = async () => {
      if (!contactId || deleting) return;
      try {
        setDeleting(true);
        const ok = await deleteContact(contactId);
        if (ok) router.replace('/');
        else Alert.alert(t.common.error ?? 'Error', t.common.deleteError ?? 'Could not delete contact.');
      } catch (e) {
        console.error(e);
        Alert.alert('Error', e instanceof Error ? e.message : String(e));
      } finally {
        setDeleting(false);
      }
    };
    if (typeof window !== 'undefined' && !(window as any).ReactNativeWebView) {
      if (confirm(`Delete ${contact?.first_name} ${contact?.surname}?`)) doDelete();
    } else {
      Alert.alert(
        'Delete contact',
        `Delete ${contact?.first_name} ${contact?.surname}?`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]
      );
    }
  };

  useEffect(() => {
    if (contactId) loadAll();
  }, [contactId]);

  // Sequential loads to avoid concurrent SQLite statements on the same connection
  const loadAll = async () => {
    try {
      if (!contactId) return;
      const data = await getContact(contactId);
      if (!data) { setError(t.detail.notFound); return; }
      setContact(data as ContactDetail);
      await fetchContacts();
      setIdentityCards(await getIdentityCards(contactId));
      setRelationships(await getRelationships(contactId));
      setOrganizations(await getContactOrganizations(contactId));
      setPhones(await getContactPhones(contactId));
      setEmails(await getContactEmails(contactId));
      setKeywords(await getContactKeywords(contactId));
      setBankAccounts(await getBankAccounts(contactId));
      setNotes(await getContactNotes(contactId));
      setContactUrls(await getContactUrls(contactId));
    } catch {
      setError(t.detail.loadError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  if (error || !contact) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || t.detail.notFound}</Text>
        <Link href="../" style={styles.backLink}>{t.detail.back}</Link>
      </View>
    );
  }

  const detailFields = Object.entries(contact).filter(
    ([key, value]) => !EXCLUDED_FIELDS.includes(key) && value !== null && value !== undefined
  );
  const primaryDetailRows = [
    {
      key: 'firstName',
      label: t.detail.firstNameLabel,
      value: [contact.first_name, contact.middle_name].filter(Boolean).join(' '),
    },
    {
      key: 'surname',
      label: t.detail.surnameLabel,
      value: contact.surname,
    },
    contact.birthdate ? {
      key: 'birthdate',
      label: t.detail.dobLabel,
      value: formatBirthdate(contact.birthdate, lang),
      helperText: calcularEdad(contact.birthdate, t.age),
    } : null,
    contact.gender ? {
      key: 'gender',
      label: t.detail.genderLabel,
      value: contact.gender === 'MALE' ? t.contacts.male : t.contacts.female,
    } : null,
    contact.status_id ? {
      key: 'status',
      label: t.detail.maritalLabel,
      value: contact.status_id,
    } : null,
  ].filter(Boolean) as { key: string; label: string; value: string; helperText?: string | null }[];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: `${contact.first_name ?? ''} ${contact.surname ?? ''}`.trim() }} />

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>

        {/* Encabezado */}
        <View style={styles.headerContainer}>
          {(() => {
            const key = getZodiacKey(contact.birthdate);
            if (!key) return null;
            const z = t.zodiac[key];
            const symbol = getZodiacSymbol(contact.birthdate);
            return (
              <View style={styles.zodiacRow}>
                {symbol ? <Text style={styles.zodiacSymbol}>{symbol}</Text> : null}
                <Text style={styles.zodiacName}>{z.name}</Text>
                <Text style={styles.zodiacDesc}>{z.description}</Text>
              </View>
            );
          })()}
        </View>

        {/* Card detalles */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t.detail.details}</Text>
            <View style={styles.cardActions}>
              <Pressable style={styles.editButton} onPress={() => setEditVisible(true)}>
                <Text style={styles.editButtonText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>{t.common.delete}</Text>
              </Pressable>
            </View>
          </View>

          {primaryDetailRows.map(row => (
            <DetailInfoRow
              key={row.key}
              label={row.label}
              value={row.value}
              helperText={row.helperText}
            />
          ))}

          {detailFields.filter(([key]) => key !== 'birthdate').map(([key, value]) => (
            <DetailInfoRow
              key={key}
              label={key.replace(/_/g, ' ').toUpperCase()}
              value={String(value)}
            />
          ))}
        </View>

        <ContactInfoCard contactId={contactId} initialPhones={phones} initialEmails={emails} />
        <DocumentsCard contactId={contactId} initialCards={identityCards} />
        <RelationshipsCard contactId={contactId} initialRelationships={relationships} onNavigate={cid => router.push(`/contact/${cid}`)} />
        <OrganizationsCard contactId={contactId} birthdate={contact.birthdate} initialOrganizations={organizations} />
        <KeywordsCard contactId={contactId} initialKeywords={keywords} />
        <BankAccountCard contactId={contactId} initialAccounts={bankAccounts} />
        <UrlsCard contactId={contactId} initialUrls={contactUrls} />
        <NotesCard contactId={contactId} initialNotes={notes} />

      </ScrollView>

      <EditContactModal
        visible={editVisible}
        contact={contact}
        onClose={() => setEditVisible(false)}
        onSaved={updated => setContact(updated)}
      />
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40, maxWidth: 900, width: '100%', alignSelf: 'center' },
  contentDesktop: { paddingHorizontal: 32, paddingVertical: 28 },

  headerContainer: { alignItems: 'center', marginBottom: 24 },
  zodiacRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zodiacSymbol: { fontSize: 20 },
  zodiacName: { fontSize: 13, fontWeight: '700', color: '#555' },
  zodiacDesc: { fontSize: 13, color: '#8E8E93', textAlign: 'center', flexShrink: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#333' },

  editButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#007AFF' },
  editButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FF3B30' },
  deleteButtonText: { color: '#FF3B30', fontSize: 14, fontWeight: '600' },

  errorText: { fontSize: 16, color: '#FF3B30', marginBottom: 10 },
  backLink: { fontSize: 16, color: '#007AFF' },
});
