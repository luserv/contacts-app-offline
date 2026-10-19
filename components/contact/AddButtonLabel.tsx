import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../utils/i18n';
import { useTheme } from '../../utils/theme';
import { useSharedStyles } from './contactStyles';

/** Content of the small "Add" pill at the top of each detail card: icon plus label. */
export default function AddButtonLabel() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const s = useSharedStyles();
  return (
    <View style={styles.row}>
      <Ionicons name="add" size={16} color={colors.accent} />
      <Text style={s.addButtonText}>{t.common.add}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
