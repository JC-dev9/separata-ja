import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';
import { KEYS, semitonesBetween } from '@/src/utils/chord-transposer';

interface Props {
  originalKey: string;
  currentKey: string;
  onSelectKey: (key: string) => void;
  onShiftSemitone: (delta: number) => void;
  onRestore: () => void;
}

export interface KeySheetHandle {
  present: () => void;
  dismiss: () => void;
}

export const KeySheet = forwardRef<KeySheetHandle, Props>(function KeySheet(
  { originalKey, currentKey, onSelectKey, onShiftSemitone, onRestore },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  const semitones = semitonesBetween(originalKey, currentKey);
  const isOriginal = semitones === 0;

  // Build a 2-row layout: keys before C..B starting at original.
  const rows = useMemo(() => {
    const half = Math.ceil(KEYS.length / 2);
    return [KEYS.slice(0, half), KEYS.slice(half)];
  }, []);

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tom da música</Text>
          <Text style={styles.sub}>
            Original: <Text style={styles.subStrong}>{originalKey}</Text>
          </Text>
        </View>

        <View style={styles.tonalCard}>
          <Pressable
            onPress={() => onShiftSemitone(-1)}
            accessibilityRole="button"
            accessibilityLabel="Descer meio tom"
            style={({ pressed }) => [styles.tomBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
            <Text style={styles.tomBtnLabel}>½ tom</Text>
          </Pressable>

          <View style={styles.currentBadge}>
            <Text style={styles.currentLabel}>Atual</Text>
            <Text style={styles.currentKey}>{currentKey}</Text>
            <Text style={styles.currentDelta}>
              {semitones === 0 ? 'original' : `${semitones > 0 ? '+' : ''}${semitones} st`}
            </Text>
          </View>

          <Pressable
            onPress={() => onShiftSemitone(1)}
            accessibilityRole="button"
            accessibilityLabel="Subir meio tom"
            style={({ pressed }) => [styles.tomBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.tomBtnLabel}>½ tom</Text>
            <Ionicons name="add" size={18} color={colors.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={onRestore}
          disabled={isOriginal}
          accessibilityRole="button"
          accessibilityLabel="Restaurar tom original"
          accessibilityState={{ disabled: isOriginal }}
          style={({ pressed }) => [
            styles.restore,
            isOriginal && styles.restoreDisabled,
            pressed && !isOriginal && styles.pressed,
          ]}
        >
          <Ionicons
            name="refresh"
            size={16}
            color={isOriginal ? colors.textDim : colors.primary}
          />
          <Text style={[styles.restoreLabel, isOriginal && styles.restoreLabelDisabled]}>
            Restaurar tom original
          </Text>
        </Pressable>

        <Text style={styles.sectionLabel}>ESCOLHER TOM</Text>
        <View style={styles.gridWrap}>
          {rows.map((row, rIdx) => (
            <View key={rIdx} style={styles.gridRow}>
              {row.map((k) => {
                const active = k === currentKey;
                const isOrig = k === originalKey;
                return (
                  <Pressable
                    key={k}
                    onPress={() => onSelectKey(k)}
                    accessibilityRole="button"
                    accessibilityLabel={isOrig ? `Tom ${k}, original` : `Tom ${k}`}
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.keyChip,
                      active && styles.keyChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.keyChipLabel, active && styles.keyChipLabelActive]}>
                      {k}
                    </Text>
                    {isOrig ? <View style={styles.origDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.surface },
  handle: { backgroundColor: colors.border, width: 40 },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 13 },
  subStrong: { color: colors.primary, fontWeight: '700' },
  tonalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  tomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tomBtnLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  currentBadge: {
    alignItems: 'center',
    flex: 1,
  },
  currentLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  currentKey: { color: colors.primary, fontSize: 32, fontWeight: '800', lineHeight: 36 },
  currentDelta: { color: colors.textMuted, fontSize: 11 },
  restore: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  restoreDisabled: { opacity: 0.45 },
  restoreLabel: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  restoreLabelDisabled: { color: colors.textDim },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  gridWrap: { gap: spacing.sm },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  keyChip: {
    minWidth: 52,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  keyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keyChipLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  keyChipLabelActive: { color: colors.background },
  origDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
});
