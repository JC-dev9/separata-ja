import { Children, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';

interface Props {
  title: string;
  /** Texto discreto por baixo do cartão, para explicar o que as linhas não cabem a dizer. */
  footer?: string;
  children: ReactNode;
}

export function SettingsSection({ title, footer, children }: Props) {
  // Separadores entre linhas, não à volta delas: o cartão já tem borda.
  const rows = Children.toArray(children);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <View key={i} style={i > 0 && styles.divider}>
            {row}
          </View>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footer: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
  },
});
