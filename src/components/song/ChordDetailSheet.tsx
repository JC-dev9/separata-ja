import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GuitarDiagram } from '@/src/components/song/diagrams/GuitarDiagram';
import { PianoDiagram } from '@/src/components/song/diagrams/PianoDiagram';
import { getGuitarShape, getPianoShape } from '@/src/data/chord-shapes';
import { useChordSound } from '@/src/hooks/useChordSound';
import { colors, radius, spacing } from '@/src/theme/colors';
import { Instrument } from './ChordDictionary';

interface Props {
  defaultInstrument: Instrument;
}

export interface ChordDetailSheetHandle {
  present: (chord: string) => void;
  dismiss: () => void;
}

export const ChordDetailSheet = forwardRef<ChordDetailSheetHandle, Props>(function ChordDetailSheet(
  { defaultInstrument },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [chord, setChord] = useState<string>('');
  const [instrument, setInstrument] = useState<Instrument>(defaultInstrument);
  const { play } = useChordSound();

  useImperativeHandle(ref, () => ({
    present: (c: string) => {
      setChord(c);
      setInstrument(defaultInstrument);
      sheetRef.current?.present();
    },
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>{chord || ' '}</Text>
          <View style={styles.toggle}>
            <Pressable
              onPress={() => setInstrument('guitar')}
              accessibilityRole="button"
              accessibilityLabel="Mostrar diagrama de violão"
              accessibilityState={{ selected: instrument === 'guitar' }}
              style={[styles.toggleBtn, instrument === 'guitar' && styles.toggleBtnActive]}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  instrument === 'guitar' && styles.toggleLabelActive,
                ]}
              >
                Violão
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setInstrument('piano')}
              accessibilityRole="button"
              accessibilityLabel="Mostrar diagrama de teclado"
              accessibilityState={{ selected: instrument === 'piano' }}
              style={[styles.toggleBtn, instrument === 'piano' && styles.toggleBtnActive]}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  instrument === 'piano' && styles.toggleLabelActive,
                ]}
              >
                Teclado
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.diagram}>
          {instrument === 'guitar' ? (
            <GuitarDiagram chord={chord} shape={getGuitarShape(chord)} size="lg" />
          ) : (
            <PianoDiagram chord={chord} shape={getPianoShape(chord)} size="lg" />
          )}
        </View>

        <Pressable
          onPress={() => play(chord)}
          accessibilityRole="button"
          accessibilityLabel={`Ouvir o acorde ${chord}`}
          style={({ pressed }) => [styles.listenBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="volume-high" size={18} color={colors.background} />
          <Text style={styles.listenLabel}>Ouvir Acorde</Text>
        </Pressable>

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { color: colors.primary, fontSize: 24, fontWeight: '800' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
  toggleLabelActive: { color: colors.background },
  diagram: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  listenLabel: { color: colors.background, fontWeight: '700', fontSize: 15 },
});
