import * as WebBrowser from 'expo-web-browser';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LAST_UPDATED, PRIVACY_BLOCKS, PrivacyBlock } from '@/src/data/privacy';
import { colors, radius, spacing } from '@/src/theme/colors';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Última actualização: {LAST_UPDATED}</Text>
        {PRIVACY_BLOCKS.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Block({ block }: { block: PrivacyBlock }) {
  const { heading, paragraphs, bullets, rows, link } = block;

  return (
    <View style={styles.block}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      {paragraphs?.map((text, i) => (
        <Text key={i} style={styles.paragraph}>
          {text}
        </Text>
      ))}
      {bullets ? (
        <View style={styles.bullets}>
          {bullets.map((text, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {rows ? (
        <View style={styles.table}>
          {rows.map((row, i) => (
            <Fragment key={i}>
              <View style={[styles.tableRow, i > 0 && styles.tableDivider]}>
                <Text style={styles.tableWhat}>{row.what}</Text>
                <Text style={styles.tableWhy}>{row.why}</Text>
              </View>
            </Fragment>
          ))}
        </View>
      ) : null}
      {link ? (
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(link.url)}
          accessibilityRole="link"
          accessibilityLabel={`Abrir ${link.label}`}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.link}>{link.label} ↗</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  updated: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: spacing.lg,
  },
  block: { marginBottom: spacing.lg },
  heading: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  paragraph: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bullets: { gap: spacing.xs },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bulletDot: {
    color: colors.primary,
    fontSize: 15,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  table: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  tableRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  tableDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tableWhat: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  tableWhy: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  pressed: { opacity: 0.7 },
});
