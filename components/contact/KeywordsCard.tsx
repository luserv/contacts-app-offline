import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactKeyword, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { useSharedStyles } from './contactStyles';
import { useTheme } from '../../utils/theme';

interface Props {
  contactId: string;
  initialKeywords: ContactKeyword[];
}

export default function KeywordsCard({ contactId, initialKeywords }: Props) {
  const s = useSharedStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { getContactKeywords, addContactKeyword, removeContactKeyword } = useContacts();

  const [keywords, setKeywords] = useState<ContactKeyword[]>(initialKeywords);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);

  const openInput = () => {
    setInput('');
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAdd = async () => {
    const trimmed = input.trim();
    if (!trimmed) { setAdding(false); return; }
    if (keywords.some(k => k.keyword.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t.common.error, t.keywords.duplicate);
      return;
    }
    const ok = await addContactKeyword(contactId, trimmed);
    if (ok) {
      setKeywords(await getContactKeywords(contactId));
    }
    setInput('');
    setAdding(false);
  };

  const handleRemove = (kw: ContactKeyword) => {
    Alert.alert(t.keywords.deleteTitle, t.keywords.deleteConfirm(kw.keyword), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive', onPress: async () => {
          await removeContactKeyword(kw.id);
          setKeywords(prev => prev.filter(k => k.id !== kw.id));
        },
      },
    ]);
  };

  if (keywords.length === 0 && !adding) {
    return (
      <Pressable style={s.addRow} onPress={openInput}>
        <View style={s.addRowIcon} accessible={false} importantForAccessibility="no-hide-descendants"><Text style={s.addRowIconText}>+</Text></View>
        <Text style={s.addRowLabel}>{t.keywords.title}</Text>
      </Pressable>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{t.keywords.title}</Text>
        {!adding && (
          <Pressable style={s.addButton} onPress={openInput} accessibilityLabel={t.keywords.title}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.chipsContainer}>
        {keywords.map(kw => (
          <Pressable key={kw.id} style={styles.chip} onLongPress={() => handleRemove(kw)}>
            <Text style={[styles.chipText, { color: colors.accent }]}>{kw.keyword}</Text>
            <Pressable onPress={() => handleRemove(kw)} hitSlop={6} accessibilityLabel={t.common.delete}>
              <Text style={[styles.chipRemove, { color: colors.accent }]}>✕</Text>
            </Pressable>
          </Pressable>
        ))}

        {adding && (
          <View style={styles.inputChip}>
            <TextInput
              ref={inputRef}
              style={styles.inputChipText}
              value={input}
              onChangeText={setInput}
              placeholder={t.keywords.placeholder}
              placeholderTextColor={colors.placeholder}
              onSubmitEditing={handleAdd}
              onBlur={handleAdd}
              returnKeyType="done"
              blurOnSubmit={false}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E5F0FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 14, color: '#0066D6', fontWeight: '500' },
  chipRemove: { fontSize: 11, color: '#0066D6', fontWeight: '700' },
  inputChip: {
    backgroundColor: '#F2F2F7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#0066D6', minWidth: 120,
  },
  inputChipText: { fontSize: 14, color: '#000', minWidth: 100 },
});
