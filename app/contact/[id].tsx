import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabBar from '../../components/BottomTabBar';
import BankAccountCard from '../../components/contact/BankAccountCard';
import ContactInfoCard from '../../components/contact/ContactInfoCard';
import KeywordsCard from '../../components/contact/KeywordsCard';
import DocumentsCard from '../../components/contact/DocumentsCard';
import EditContactModal from '../../components/contact/EditContactModal';
import OrganizationsCard from '../../components/contact/OrganizationsCard';
import RelationshipsCard from '../../components/contact/RelationshipsCard';
import { ContactBankAccount, ContactEmail, ContactKeyword, ContactOrganization, ContactPhone, IdentityCard, Relationship, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { calcularEdad, ContactDetail, EXCLUDED_FIELDS, getZodiacKey, getZodiacSymbol } from '../../utils/contactUtils';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { getContact, getIdentityCards, getRelationships, getContactOrganizations, getContactPhones, getContactEmails, getContactKeywords, getBankAccounts, fetchContacts, deleteContact } = useContacts();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [identityCards, setIdentityCards] = useState<IdentityCard[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [organizations, setOrganizations] = useState<ContactOrganization[]>([]);
  const [phones, setPhones] = useState<ContactPhone[]>([]);
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [keywords, setKeywords] = useState<ContactKeyword[]>([]);
  const [bankAccounts, setBankAccounts] = useState<ContactBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const handleDelete = () => {
    const doDelete = async () => {
      const ok = await deleteContact(id);
      if (ok) router.replace('/');
    };
    if (typeof window !== 'undefined' && !(window as any).ReactNativeWebView) {
      if (confirm(`¿Eliminar a ${contact?.first_name} ${contact?.surname}?`)) doDelete();
    } else {
      Alert.alert(
        'Eliminar contacto',
        `¿Eliminar a ${contact?.first_name} ${contact?.surname}?`,
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: doDelete }]
      );
    }
  };

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  // Sequential loads to avoid concurrent SQLite statements on the same connection
  const loadAll = async () => {
    try {
      const data = await getContact(id);
      if (!data) { setError(t.detail.notFound); return; }
      setContact(data as ContactDetail);
      await fetchContacts();
      setIdentityCards(await getIdentityCards(id));
      setRelationships(await getRelationships(id));
      setOrganizations(await getContactOrganizations(id));
      setPhones(await getContactPhones(id));
      setEmails(await getContactEmails(id));
      setKeywords(await getContactKeywords(id));
      setBankAccounts(await getBankAccounts(id));
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: `${contact.first_name} ${contact.surname}` }} />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {getZodiacSymbol(contact.birthdate) ? (
              <Text style={styles.avatarZodiac}>{getZodiacSymbol(contact.birthdate)}</Text>
            ) : (
              <Text style={styles.avatarText}>
                {contact.first_name?.[0]?.toUpperCase()}
                {contact.surname?.[0]?.toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.name}>
            {[contact.first_name, contact.middle_name, contact.surname].filter(Boolean).join(' ')}
          </Text>
          {(() => {
            const key = getZodiacKey(contact.birthdate);
            if (!key) return null;
            const z = t.zodiac[key];
            return (
              <View style={styles.zodiacRow}>
                <Text style={styles.zodiacName}>{z.name}</Text>
                <Text style={styles.zodiacDot}>·</Text>
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

          <View style={styles.infoRow}>
            <Text style={styles.label}>{t.detail.nameLabel}</Text>
            <Text style={styles.value}>
              {[contact.first_name, contact.middle_name, contact.surname].filter(Boolean).join(' ')}
            </Text>
          </View>

          {contact.birthdate && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t.detail.dobLabel}</Text>
              <Text style={styles.value}>{contact.birthdate}</Text>
              {calcularEdad(contact.birthdate, t.age) && (
                <Text style={styles.edad}>{calcularEdad(contact.birthdate, t.age)}</Text>
              )}
            </View>
          )}

          {contact.gender && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t.detail.genderLabel}</Text>
              <Text style={styles.value}>
                {contact.gender === 'MALE' ? t.contacts.male : t.contacts.female}
              </Text>
            </View>
          )}

          {contact.status_id && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t.detail.maritalLabel}</Text>
              <Text style={styles.value}>{contact.status_id}</Text>
            </View>
          )}

          {detailFields.filter(([key]) => key !== 'birthdate').map(([key, value]) => (
            <View key={key} style={styles.infoRow}>
              <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text style={styles.value}>{String(value)}</Text>
            </View>
          ))}
        </View>

        <ContactInfoCard contactId={id} initialPhones={phones} initialEmails={emails} />
        <DocumentsCard contactId={id} initialCards={identityCards} />
        <RelationshipsCard contactId={id} initialRelationships={relationships} onNavigate={cid => router.push(`/contact/${cid}`)} />
        <OrganizationsCard contactId={id} birthdate={contact.birthdate} initialOrganizations={organizations} />
        <KeywordsCard contactId={id} initialKeywords={keywords} />
        <BankAccountCard contactId={id} initialAccounts={bankAccounts} />

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
  content: { padding: 20, paddingBottom: 40 },

  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  avatarZodiac: { fontSize: 48 },
  zodiacRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4,
  },
  zodiacName: { fontSize: 14, fontWeight: '700', color: '#555' },
  zodiacDot: { fontSize: 14, color: '#C7C7CC' },
  zodiacDesc: { fontSize: 13, color: '#8E8E93' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#000' },

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

  infoRow: { marginBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee', paddingBottom: 10 },
  label: { fontSize: 11, color: '#8E8E93', marginBottom: 3 },
  value: { fontSize: 16, color: '#000' },
  edad: { fontSize: 13, color: '#007AFF', marginTop: 3 },

  errorText: { fontSize: 16, color: '#FF3B30', marginBottom: 10 },
  backLink: { fontSize: 16, color: '#007AFF' },
});
