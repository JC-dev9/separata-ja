import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';
import { Instrument } from '@/src/types/song';

interface Props {
  value: Instrument;
  onChange: (instrument: Instrument) => void;
}

/**
 * Segmented control violão/teclado.
 *
 * Copiado do `ToggleBtn` de `ChordDictionary` em vez de extraído: unificar as
 * cópias que já existem lá e em `ChordDetailSheet` é uma limpeza à parte, e os
 * dois ecrãs estão bem como estão.
 */
export function InstrumentToggle({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Btn
        icon="guitar-acoustic"
        label="Violão"
        active={value === 'guitar'}
        onPress={() => onChange('guitar')}
      />
      <Btn
        icon="piano"
        label="Teclado"
        active={value === 'piano'}
        onPress={() => onChange('piano')}
      />
    </View>
  );
}

interface BtnProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}

function Btn({ icon, label, active, onPress }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.btn, active && styles.btnActive, pressed && { opacity: 0.8 }]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={active ? colors.background : colors.text}
      />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 4,
  },
  btnActive: { backgroundColor: colors.primary },
  label: { color: colors.text, fontSize: 12, fontWeight: '600' },
  labelActive: { color: colors.background },
});
