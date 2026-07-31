import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';

const SNAP_POINTS = ['38%'];

interface Props {
  suggestions: string[];
  onPick: (chord: string) => void;
}

export interface ChordPickerSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export const ChordPickerSheet = forwardRef<ChordPickerSheetHandle, Props>(
  function ChordPickerSheet({ suggestions, onPick }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [customOpen, setCustomOpen] = useState(false);
    const [custom, setCustom] = useState('');

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

    const pick = (chord: string) => {
      const cleaned = chord.trim();
      if (!cleaned) return;
      onPick(cleaned);
      sheetRef.current?.dismiss();
    };

    const openCustom = () => {
      setCustom('');
      setCustomOpen(true);
    };

    const confirmCustom = () => {
      setCustomOpen(false);
      pick(custom);
    };

    return (
      <>
        <BottomSheetModal
          ref={sheetRef}
          snapPoints={SNAP_POINTS}
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.bg}
          handleIndicatorStyle={styles.handle}
        >
          <BottomSheetView style={styles.container}>
            <Text style={styles.title}>Adicionar acorde</Text>

            {suggestions.length > 0 ? (
              <>
                <Text style={styles.label}>Acordes desta música</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {suggestions.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => pick(c)}
                      accessibilityRole="button"
                      accessibilityLabel={`Adicionar o acorde ${c}`}
                      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                    >
                      <Text style={styles.chipText}>{c}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <Pressable
              onPress={openCustom}
              accessibilityRole="button"
              accessibilityLabel="Escrever outro acorde"
              style={({ pressed }) => [styles.outroBtn, pressed && styles.pressed]}
            >
              <Text style={styles.outroBtnText}>Escrever outro acorde…</Text>
            </Pressable>

            <View style={{ height: spacing.xl }} />
          </BottomSheetView>
        </BottomSheetModal>

        <Modal
          visible={customOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCustomOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBackdrop}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setCustomOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Outro acorde</Text>
              <TextInput
                value={custom}
                onChangeText={setCustom}
                placeholder="ex: F#m, Bb7"
                accessibilityLabel="Nome do acorde"
                placeholderTextColor={colors.textDim}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                style={styles.input}
                onSubmitEditing={confirmCustom}
                returnKeyType="done"
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setCustomOpen(false)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                >
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={confirmCustom}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar acorde"
                  style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.addBtnText}>Adicionar</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  },
);

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
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.chord,
    fontWeight: '700',
    fontSize: 16,
  },
  pressed: { opacity: 0.6 },
  outroBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  outroBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  modalCancel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  addBtnText: {
    color: colors.background,
    fontWeight: '700',
  },
});
