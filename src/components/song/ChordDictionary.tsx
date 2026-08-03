import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { GuitarDiagram } from '@/src/components/song/diagrams/GuitarDiagram';
import { PianoDiagram } from '@/src/components/song/diagrams/PianoDiagram';
import { getGuitarShape, getPianoShape } from '@/src/data/chord-shapes';
import { useChordDictionaryCollapsed } from '@/src/hooks/useChordDictionaryCollapsed';
import { colors, radius, spacing } from '@/src/theme/colors';

export type Instrument = 'guitar' | 'piano';

interface Props {
  chords: string[];
  instrument: Instrument;
  onChangeInstrument: (i: Instrument) => void;
  onPressChord: (chord: string) => void;
}

export function ChordDictionary({ chords, instrument, onChangeInstrument, onPressChord }: Props) {
  const { collapsed, toggle } = useChordDictionaryCollapsed();

  return (
    <Animated.View style={styles.wrap} layout={LinearTransition.duration(200)}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={
            collapsed
              ? `Mostrar dicionário de acordes, ${chords.length} acordes`
              : 'Ocultar dicionário de acordes'
          }
          accessibilityState={{ expanded: !collapsed }}
          style={styles.titleRow}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name={collapsed ? 'chevron-right' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
          <Text style={styles.title}>
            Acordes
            {collapsed ? (
              <Text style={styles.badge}> · {chords.length}</Text>
            ) : null}
          </Text>
        </Pressable>
        <View style={[styles.toggle, collapsed && styles.toggleFaded]}>
          <ToggleBtn
            icon="guitar-acoustic"
            label="Violão"
            active={instrument === 'guitar'}
            onPress={() => onChangeInstrument('guitar')}
          />
          <ToggleBtn
            icon="piano"
            label="Teclado"
            active={instrument === 'piano'}
            onPress={() => onChangeInstrument('piano')}
          />
        </View>
      </View>

      {!collapsed && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {chords.map((chord) => (
              <Pressable
                key={chord}
                onPress={() => onPressChord(chord)}
                accessibilityRole="button"
                accessibilityLabel={`Ver o acorde ${chord}`}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
              >
                {instrument === 'guitar' ? (
                  <GuitarDiagram chord={chord} shape={getGuitarShape(chord)} size="sm" />
                ) : (
                  <PianoDiagram chord={chord} shape={getPianoShape(chord)} size="sm" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </Animated.View>
  );
}

interface ToggleBtnProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}

function ToggleBtn({ icon, label, active, onPress }: ToggleBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mostrar acordes para ${label}`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.toggleBtn,
        active && styles.toggleBtnActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={active ? colors.background : colors.text}
      />
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badge: {
    color: colors.textMuted,
    fontWeight: '400',
    letterSpacing: 0,
  },
  toggleFaded: { opacity: 0.4 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 4,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
  toggleLabelActive: { color: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
