import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useResponsive } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/theme';

export function useSharedStyles() {
  const { isDesktop, isTablet } = useResponsive();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  return useMemo(() => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.shadowOpacity,
      shadowRadius: 4,
      elevation: 1,
    },
    addRow: {
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: isDesktop ? 20 : isTablet ? 18 : 16,
      marginBottom: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.shadowOpacity,
      shadowRadius: 4,
      elevation: 1,
    },
    addRowInline: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 8,
      gap: 8,
    },
    addRowIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.accentSubtle,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    addRowLabel: { color: c.accent, fontSize: 15, fontWeight: '500' as const },
    cardHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: isDesktop ? 17 : isTablet ? 16 : 15,
      fontWeight: '600' as const,
      color: c.text,
      letterSpacing: 0,
    },
    addButton: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: c.accentSubtle,
      minHeight: 48,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    addButtonText: { color: c.accent, fontSize: 14, fontWeight: '600' as const },
    emptyText: { color: c.textSecondary, fontSize: 14, textAlign: 'center' as const, paddingVertical: 10 },
    removeBtn: {
      minHeight: 48,
      minWidth: 48,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    cardRow: {
      flexDirection: 'row' as const,
      flexWrap: (isDesktop || isTablet) ? 'wrap' as const : 'nowrap' as const,
      gap: isDesktop ? 16 : isTablet ? 12 : 0,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: (isDesktop || isTablet) ? ('center' as const) : ('flex-end' as const),
    },
    modalContainer: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderRadius: (isDesktop || isTablet) ? 14 : undefined,
      padding: isDesktop ? 24 : isTablet ? 22 : 20,
      // Bottom sheets on phones sit above the system navigation bar (edge-to-edge).
      paddingBottom: (isDesktop ? 24 : isTablet ? 22 : 20) + (isDesktop || isTablet ? 0 : insets.bottom),
      maxHeight: '85%' as const,
      maxWidth: isDesktop ? 600 : isTablet ? 540 : undefined,
      alignSelf: (isDesktop || isTablet) ? ('center' as const) : undefined,
      width: (isDesktop || isTablet) ? ('100%' as const) : undefined,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: c.text,
      textAlign: 'center' as const,
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginTop: 16,
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    required: { color: c.destructive },
    input: {
      borderWidth: 0,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 17,
      color: c.text,
      backgroundColor: c.surface,
      minHeight: 48,
    },
    modalActions: { flexDirection: 'row' as const, gap: 10, marginTop: 20 },
    btnCancel: {
      flex: 1, paddingVertical: 13, borderRadius: 10,
      backgroundColor: c.surfaceElevated, alignItems: 'center' as const,
    },
    btnCancelText: { fontSize: 16, fontWeight: '600' as const, color: c.text },
    btnSave: {
      flex: 1, paddingVertical: 13, borderRadius: 10,
      backgroundColor: c.accent, alignItems: 'center' as const,
    },
    btnSaveText: { fontSize: 16, fontWeight: '600' as const, color: '#FFFFFF' },
    btnDisabled: { backgroundColor: c.textTertiary },
  }), [isDesktop, isTablet, c, insets.bottom]);
}
