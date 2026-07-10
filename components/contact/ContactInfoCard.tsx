import { copyToClipboard } from '../../utils/clipboard';
import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactEmail, ContactPhone, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { useSharedStyles } from './contactStyles';
import { useTheme } from '../../utils/theme';

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

function normalizeDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

type PhoneActionItem = {
  key: string;
  label: string;
  color: string;
  url: string;
};

// Schemes in fixed order: [whatsapp, whatsappBusiness, telegram, signal]
const _MSG_SCHEMES = ['whatsapp://', 'whatsappbusiness://', 'tg://', 'sgnl://'];
// canOpenURL results are stable for the app session — cache once, reuse forever
let _appChecksCache: Promise<boolean[]> | null = null;
function getAppChecks(): Promise<boolean[]> {
  if (!_appChecksCache) {
    _appChecksCache = Promise.all(
      _MSG_SCHEMES.map(scheme => Linking.canOpenURL(scheme).catch(() => false))
    );
  }
  return _appChecksCache;
}

async function resolvePhoneActions(phone: string, labels: { callPhone: string; sendSms: string; whatsapp: string; whatsappBusiness: string; telegram: string; signal: string }): Promise<PhoneActionItem[]> {
  const normalized = normalizePhone(phone);
  const digitsOnly = normalizeDigitsOnly(phone);

  const actions: PhoneActionItem[] = [
    { key: 'sms', label: labels.sendSms, color: '#34C759', url: `sms:${normalized}` },
  ];

  const messagingApps = [
    {
      key: 'whatsapp',
      label: labels.whatsapp,
      color: '#25D366',
      url: `whatsapp://send?phone=${normalized}`,
      webUrl: `https://wa.me/${digitsOnly}`,
    },
    {
      key: 'whatsappBusiness',
      label: labels.whatsappBusiness,
      color: '#25D366',
      url: `whatsappbusiness://send?phone=${normalized}`,
      webUrl: null,
    },
    {
      key: 'telegram',
      label: labels.telegram,
      color: '#0088CC',
      url: `https://t.me/+${digitsOnly}`,
      webUrl: `https://t.me/+${digitsOnly}`,
    },
    {
      key: 'signal',
      label: labels.signal,
      color: '#3A76F0',
      url: `sgnl://send?address=${normalized}`,
      webUrl: null,
    },
  ];

  if (Platform.OS === 'web') {
    for (const app of messagingApps) {
      if (app.webUrl) {
        actions.push({ key: app.key, label: app.label, color: app.color, url: app.webUrl });
      }
    }
  } else {
    const checks = await getAppChecks();
    messagingApps.forEach((app, i) => {
      if (checks[i]) {
        actions.push({ key: app.key, label: app.label, color: app.color, url: app.url });
      }
    });
  }

  return actions;
}

interface Props {
  contactId: string;
  initialPhones: ContactPhone[];
  initialEmails: ContactEmail[];
}

export default function ContactInfoCard({ contactId, initialPhones, initialEmails }: Props) {
  const s = useSharedStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { getContactPhones, addContactPhone, updateContactPhone, removeContactPhone, getContactEmails, addContactEmail, updateContactEmail, removeContactEmail } = useContacts();

  const [phones, setPhones] = useState<ContactPhone[]>(initialPhones);
  const [emails, setEmails] = useState<ContactEmail[]>(initialEmails);

  const [actionsSheet, setActionsSheet] = useState<{ phone: string; actions: PhoneActionItem[] } | null>(null);

  const openPhoneActions = useCallback(async (phone: string) => {
    const actions = await resolvePhoneActions(phone, t.contactInfo.phoneActions);
    setActionsSheet({ phone, actions });
  }, [t.contactInfo.phoneActions]);

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
          {phones.length > 0 && (
            <Pressable style={s.addButton} onPress={openAddPhoneModal} accessibilityLabel={t.contactInfo.addPhone}>
              <Text style={s.addButtonText}>{t.common.add}</Text>
            </Pressable>
          )}
        </View>

        {phones.length === 0 ? (
          <Pressable style={s.addRowInline} onPress={openAddPhoneModal}>
            <View style={s.addRowIcon}><Text style={s.addRowIconText}>+</Text></View>
            <Text style={s.addRowLabel}>{t.contactInfo.addPhone}</Text>
          </Pressable>
        ) : (
          phones.map(p => (
            <View key={p.id} style={styles.row}>
              <Pressable style={styles.info} onPress={() => openPhoneActions(p.phone)}>
                {p.label ? <Text style={styles.label}>{p.label}</Text> : null}
                <Text style={styles.phoneValue}>{p.phone}</Text>
              </Pressable>
              <Pressable onPress={() => openEditPhoneModal(p)} style={styles.editBtn} accessibilityLabel={t.common.edit}>
                <Text style={styles.editBtnText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemovePhone(p)} style={s.removeBtn} accessibilityLabel={t.common.delete}>
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
          {emails.length > 0 && (
            <Pressable style={s.addButton} onPress={openAddEmailModal} accessibilityLabel={t.contactInfo.addEmail}>
              <Text style={s.addButtonText}>{t.common.add}</Text>
            </Pressable>
          )}
        </View>

        {emails.length === 0 ? (
          <Pressable style={s.addRowInline} onPress={openAddEmailModal}>
            <View style={s.addRowIcon}><Text style={s.addRowIconText}>+</Text></View>
            <Text style={s.addRowLabel}>{t.contactInfo.addEmail}</Text>
          </Pressable>
        ) : (
          emails.map(e => (
            <View key={e.id} style={styles.row}>
              <Pressable style={styles.info} onPress={() => Linking.openURL(`mailto:${e.email}`)}>
                {e.label ? <Text style={styles.label}>{e.label}</Text> : null}
                <Text style={[styles.value, { color: colors.text }]}>{e.email}</Text>
              </Pressable>
              <Pressable
                style={styles.editBtn}
                accessibilityLabel={t.contactInfo.phoneActions.copyToClipboard}
                onPress={async () => {
                  await copyToClipboard(e.email);
                  Alert.alert(t.contactInfo.phoneActions.copied);
                }}
              >
                <Text style={styles.editBtnText}>📋</Text>
              </Pressable>
              <Pressable onPress={() => openEditEmailModal(e)} style={styles.editBtn} accessibilityLabel={t.common.edit}>
                <Text style={styles.editBtnText}>{t.common.edit}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemoveEmail(e)} style={s.removeBtn} accessibilityLabel={t.common.delete}>
                <Text style={s.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Phone actions sheet */}
      <Modal visible={!!actionsSheet} animationType="slide" transparent onRequestClose={() => setActionsSheet(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setActionsSheet(null)}>
          <Pressable style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>{actionsSheet?.phone}</Text>
            <Pressable
              style={[styles.actionRow, { backgroundColor: colors.surface }, styles.actionRowBorder]}
              onPress={async () => {
                await copyToClipboard(actionsSheet?.phone ?? '');
                setActionsSheet(null);
                Alert.alert(t.contactInfo.phoneActions.copied);
              }}
            >
              <Text style={[styles.actionLabel, { color: '#8E8E93' }]}>{t.contactInfo.phoneActions.copyToClipboard}</Text>
            </Pressable>
            {actionsSheet?.actions.map((action, i) => (
              <Pressable
                key={action.key}
                style={[styles.actionRow, { backgroundColor: colors.surface }, i < (actionsSheet.actions.length - 1) && styles.actionRowBorder]}
                onPress={() => {
                  setActionsSheet(null);
                  Linking.openURL(action.url).catch(() =>
                    Alert.alert(t.common.error, action.label)
                  );
                }}
              >
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              </Pressable>
            ))}
            <View style={styles.actionsDivider} />
            <Pressable style={[styles.actionRow, { backgroundColor: colors.surface }]} onPress={() => setActionsSheet(null)}>
              <Text style={styles.actionCancel}>{t.common.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal teléfono */}
      <Modal visible={phoneModal} animationType="slide" transparent onRequestClose={() => setPhoneModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer} accessibilityViewIsModal={true}>
            <Text style={s.modalTitle}>{editingPhoneId !== null ? t.common.edit : t.contactInfo.addPhone}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>{t.contacts.phone} <Text style={s.required}>{t.common.required}</Text></Text>
              <TextInput
                style={s.input} value={phoneInput} onChangeText={setPhoneInput}
                placeholder={t.contacts.phonePlaceholder} placeholderTextColor="#C7C7CC"
                keyboardType="phone-pad" autoFocus
              />
              <Text style={styles.phoneHint}>{t.contactInfo.phoneHint}</Text>
              <Text style={s.fieldLabel}>{t.contactInfo.phoneLabel}</Text>
              <TextInput
                style={s.input} value={phoneLabelInput} onChangeText={setPhoneLabelInput}
                placeholder={t.common.placeholderMobile} placeholderTextColor="#C7C7CC"
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
          <View style={s.modalContainer} accessibilityViewIsModal={true}>
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
                placeholder={t.common.placeholderPersonal} placeholderTextColor="#C7C7CC"
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
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  callBtnText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  editBtn: { paddingHorizontal: 8, paddingVertical: 8, marginRight: 2, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 14, color: '#007AFF' },
  sectionDivider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 12 },
  actionsContainer: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 8,
    overflow: 'hidden',
    maxWidth: 480,
    alignSelf: 'center' as const,
    width: '100%',
  },
  actionsTitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  actionRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  actionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  actionLabel: { fontSize: 17 },
  actionsDivider: { height: 8, backgroundColor: '#F2F2F7' },
  actionCancel: { fontSize: 17, fontWeight: '600', color: '#007AFF' },
  phoneHint: { fontSize: 12, color: '#8E8E93', marginTop: 4, marginBottom: 12, lineHeight: 16 },
});
