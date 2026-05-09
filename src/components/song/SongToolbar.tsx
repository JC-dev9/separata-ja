import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyleProp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/src/theme/colors';

export const TOOLBAR_PILL_HEIGHT = 48;
const TOOLBAR_BOTTOM_MARGIN = 16;

export function toolbarBottomOffset(insetsBottom: number) {
  return insetsBottom + TOOLBAR_BOTTOM_MARGIN + TOOLBAR_PILL_HEIGHT + spacing.sm;
}

interface Props {
  currentKey: string;
  isOriginalKey: boolean;
  autoScrollOpen: boolean;
  toolbarStyle?: AnimatedStyleProp<ViewStyle>;
  onPressKey: () => void;
  onPressListen: () => void;
  onPressAutoScroll: () => void;
  onPressFont: () => void;
}

export function SongToolbar({
  currentKey,
  isOriginalKey,
  autoScrollOpen,
  toolbarStyle,
  onPressKey,
  onPressListen,
  onPressAutoScroll,
  onPressFont,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      style={[styles.wrap, { bottom: insets.bottom + TOOLBAR_BOTTOM_MARGIN }, toolbarStyle]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        <ToolbarItem
          icon="key-outline"
          label="Tom"
          badge={currentKey}
          accent={!isOriginalKey}
          onPress={onPressKey}
        />
        <View style={styles.divider} />
        <ToolbarItem icon="logo-youtube" label="Ouvir" onPress={onPressListen} />
        <View style={styles.divider} />
        <ToolbarItem
          icon={autoScrollOpen ? 'pause-circle-outline' : 'play-circle-outline'}
          label="Rolar"
          accent={autoScrollOpen}
          onPress={onPressAutoScroll}
        />
        <View style={styles.divider} />
        <ToolbarItem icon="text-outline" label="Texto" onPress={onPressFont} />
      </View>
    </Animated.View>
  );
}

interface ItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  accent?: boolean;
  onPress: () => void;
}

function ToolbarItem({ icon, label, badge, accent, onPress }: ItemProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={accent ? colors.primary : colors.text} />
      <Text style={[styles.itemLabel, accent && { color: colors.primary }]}>
        {label}
        {badge ? ` · ${badge}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 48,
    right: 48,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    gap: spacing.xs,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    flex: 1,
  },
  itemLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
});
