import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';

interface Props {
  fontSize: number;
  onChangeFont: (delta: number) => void;
}

export interface FontSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export const FontSheet = forwardRef<FontSheetHandle, Props>(function FontSheet(
  { fontSize, onChangeFont },
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

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>Tamanho do texto</Text>

        <View style={styles.control}>
          <Pressable
            onPress={() => onChangeFont(-1)}
            accessibilityRole="button"
            accessibilityLabel="Diminuir tamanho do texto"
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.btnSmall}>A</Text>
            <Text style={styles.sign}>−</Text>
          </Pressable>

          <Text style={styles.value} accessibilityLabel={`Tamanho actual: ${fontSize}`}>
            {fontSize}
          </Text>

          <Pressable
            onPress={() => onChangeFont(+1)}
            accessibilityRole="button"
            accessibilityLabel="Aumentar tamanho do texto"
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.btnBig}>A</Text>
            <Text style={styles.sign}>+</Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.xl }} />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.surface },
  handle: { backgroundColor: colors.border, width: 40 },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  btnSmall: { color: colors.text, fontSize: 15, fontWeight: '700' },
  btnBig: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sign: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  value: {
    color: colors.primary,
    fontSize: 44,
    fontWeight: '800',
    minWidth: 64,
    textAlign: 'center',
  },
});
