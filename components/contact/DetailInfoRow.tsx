import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../utils/theme';

interface DetailInfoRowProps {
  label: string;
  value: string;
  helperText?: string | null;
}

export default function DetailInfoRow({ label, value, helperText }: DetailInfoRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.separatorFine }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      {helperText ? <Text style={[styles.helperText, { color: colors.accent }]}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  label: { fontSize: 11, color: '#6C6C70', marginBottom: 3 },
  value: { fontSize: 16, color: '#000' },
  helperText: { fontSize: 13, color: '#0066D6', marginTop: 3 },
});
