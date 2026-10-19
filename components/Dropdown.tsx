import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../utils/responsive';
import { useTheme } from '../utils/theme';
import { useI18n } from '../utils/i18n';

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
  placeholder,
  allowNull = false,
  nullLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, isTablet } = useResponsive();
  const ph = placeholder ?? t.common.select;
  const nl = nullLabel ?? t.common.unspecified;

  const selectedLabel = value
    ? options.find(o => o.value === value)?.label
    : null;

  const handleSelect = (val: string | null) => {
    onSelect(val);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.fill, borderColor: colors.inputBorder }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selectedLabel ?? ph}
      >
        <Text style={[styles.triggerText, { color: selectedLabel ? colors.text : colors.placeholder }]}>
          {selectedLabel ?? (allowNull ? nl : ph)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={[styles.overlay, (isDesktop || isTablet) && styles.overlayCentered, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, (isDesktop || isTablet) ? styles.sheetCentered : { paddingBottom: 32 + insets.bottom }, { backgroundColor: colors.surface }]} accessibilityViewIsModal={true}>
            <View style={[styles.handle, { backgroundColor: colors.separator }]} />

            <FlatList
              data={allowNull ? [{ label: nl, value: '__null__' }, ...options] : options}
              keyExtractor={item => item.value}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.separatorFine }]} />}
              renderItem={({ item }) => {
                const isNull = item.value === '__null__';
                const isSelected = isNull ? value === null : value === item.value;
                return (
                  <Pressable
                    style={[styles.option, isSelected && { backgroundColor: colors.accentSubtle }]}
                    onPress={() => handleSelect(isNull ? null : item.value)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.optionText, { color: colors.text }, isSelected && { color: colors.accent, fontWeight: '600' }]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  triggerText: { fontSize: 16 },

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '60%',
  },
  sheetCentered: {
    borderRadius: 14,
    maxWidth: 400,
    width: '100%',
    maxHeight: '50%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  optionText: { fontSize: 16 },
});
