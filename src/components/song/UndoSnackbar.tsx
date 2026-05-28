import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';

interface Props {
  message: string;
  visible: boolean;
  bottomOffset: number;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoSnackbar({
  message,
  visible,
  bottomOffset,
  onUndo,
  onDismiss,
  durationMs = 4000,
}: Props) {
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }]}>
      <View style={styles.bar}>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
        <Pressable hitSlop={8} onPress={onUndo}>
          <Text style={styles.undo}>Desfazer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 240,
    maxWidth: 480,
    gap: spacing.lg,
  },
  message: {
    color: colors.text,
    flexShrink: 1,
  },
  undo: {
    color: colors.primary,
    fontWeight: '700',
  },
});
