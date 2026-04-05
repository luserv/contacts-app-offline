import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Option {
  label: string;
  value: string;
}

interface DropdownProps {
  options: Option[];
  value: string | null;
  onSelect: (value: string | null) => void;
  placeholder?: string;
  allowNull?: boolean;
  nullLabel?: string;
}

export default function Dropdown({
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar',
  allowNull = false,
  nullLabel = 'Sin especificar',
}: DropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = value
    ? options.find(o => o.value === value)?.label
    : null;

  const handleSelect = (val: string | null) => {
    onSelect(val);
    setOpen(false);
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !selectedLabel && styles.placeholder]}>
          {selectedLabel ?? (allowNull ? nullLabel : placeholder)}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <FlatList
              data={allowNull ? [{ label: nullLabel, value: '__null__' }, ...options] : options}
              keyExtractor={item => item.value}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isNull = item.value === '__null__';
                const isSelected = isNull ? value === null : value === item.value;
                return (
                  <Pressable
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(isNull ? null : item.value)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  triggerText: { fontSize: 16, color: '#000' },
  placeholder: { color: '#C7C7CC' },
  arrow: { fontSize: 11, color: '#8E8E93' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  optionSelected: { backgroundColor: '#F0F7FF' },
  optionText: { fontSize: 16, color: '#000' },
  optionTextSelected: { color: '#007AFF', fontWeight: '600' },
  checkmark: { fontSize: 16, color: '#007AFF' },
});
