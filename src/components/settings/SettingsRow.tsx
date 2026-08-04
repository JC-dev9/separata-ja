import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/src/theme/colors';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Segunda linha, para o que a etiqueta não chega a explicar. */
  description?: string;
  /** Texto à direita — para valores que não se editam aqui (a versão, por exemplo). */
  value?: string;
  /** Controlo à direita: um Switch, um segmented control, um indicador. */
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function SettingsRow({
  icon,
  label,
  description,
  value,
  right,
  onPress,
  destructive,
  disabled,
}: Props) {
  const labelColor = destructive ? colors.danger : colors.text;

  const content = (
    <View style={[styles.row, disabled && styles.disabled]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? colors.danger : colors.textMuted}
          style={styles.icon}
        />
      ) : null}
      <View style={styles.body}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {right}
      {onPress && !right && !value ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      ) : null}
    </View>
  );

  // Sem onPress a linha não é um botão — não deve ganhar ripple nem foco.
  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={disabled ? undefined : { color: colors.surfaceElevated }}
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => pressed && !disabled && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  icon: { width: 24 },
  body: { flex: 1 },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  value: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
