import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../utils/i18n';
import { useTheme } from '../utils/theme';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
    FadeIn,
    FadeOut,
    LinearTransition,
    SharedValue,
    useAnimatedStyle
} from 'react-native-reanimated';

interface Note {
  id: string;
  title: string;
  content: string;
  modifiedDate: Date;
}

interface Props {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
}

export function SwipeableNote({ note, onPress, onDelete }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const RightAction = (
    prog: SharedValue<number>,
    drag: SharedValue<number>
  ) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 60 }],
      };
    });

    return (
      <Pressable
        onPress={() => {
          onDelete();
        }}
      >
        <Reanimated.View style={[styleAnimation, styles.rightAction]}>
          <Ionicons name="trash" size={24} color={colors.destructive} />
        </Reanimated.View>
      </Pressable>
    );
  };

  return (
    <Reanimated.View
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition}
    >
      <ReanimatedSwipeable
        key={note.id}
        friction={2}
        enableTrackpadTwoFingerGesture
        rightThreshold={40}
        renderRightActions={RightAction}
        overshootRight={false}
        enableContextMenu
        containerStyle={{
          paddingBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        <Pressable
          onPress={() => {
            onPress();
          }}
          style={[styles.swipeable, { backgroundColor: colors.surface, shadowColor: colors.text }]}
        >
          <View style={styles.content}>
            <Text style={[styles.noteTitle, { color: colors.text }]}>
              {note.title || t.common.untitledNote}
            </Text>
            <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
              {format(note.modifiedDate || new Date(), 'MMM d, yyyy')}
            </Text>
            <Text style={[styles.notePreview, { color: colors.textSecondary }]} numberOfLines={2}>
              {note.content || t.common.noAdditionalText}
            </Text>
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  swipeable: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rightAction: {
    width: 60,
    height: '100%',
    paddingBottom: 12,
    paddingRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 13,
    marginBottom: 6,
  },
  notePreview: {
    fontSize: 15,
    opacity: 0.6,
  },
});