import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';
import { STANDARD_GUITAR_TUNING } from '@/src/utils/pitch';

interface Props {
  activeStringName: string | null;
  selectedStringName: string | null;
  onSelectString: (name: string | null) => void;
}

export function TunerStrings({
  activeStringName,
  selectedStringName,
  onSelectString,
}: Props) {
  return (
    <View style={styles.row}>
      {STANDARD_GUITAR_TUNING.map((s) => {
        const isActive = activeStringName === s.name;
        const isSelected = selectedStringName === s.name;
        return (
          <Pressable
            key={s.name}
            onPress={() => onSelectString(isSelected ? null : s.name)}
            accessibilityRole="button"
            accessibilityLabel={`Corda ${s.label}`}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.dot,
              isActive && styles.dotActive,
              isSelected && styles.dotSelected,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.letter,
                (isActive || isSelected) && styles.letterActive,
              ]}
            >
              {s.name[0]}
            </Text>
            <Text
              style={[
                styles.octave,
                (isActive || isSelected) && styles.octaveActive,
              ]}
            >
              {s.name.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 1,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  letter: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  letterActive: {
    color: colors.background,
  },
  octave: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  octaveActive: {
    color: colors.background,
  },
});
