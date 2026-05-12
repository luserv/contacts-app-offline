import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DetailInfoRowProps {
  label: string;
  value: string;
  helperText?: string | null;
}

export default function DetailInfoRow({ label, value, helperText }: DetailInfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
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
  label: { fontSize: 11, color: '#8E8E93', marginBottom: 3 },
  value: { fontSize: 16, color: '#000' },
  helperText: { fontSize: 13, color: '#007AFF', marginTop: 3 },
});
