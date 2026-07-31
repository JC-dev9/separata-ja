import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/src/theme/colors';

export const TOOLBAR_PILL_HEIGHT = 48;
export const TOOLBAR_BOTTOM_MARGIN = 16;

export function toolbarBottomOffset(insetsBottom: number) {
  return insetsBottom + TOOLBAR_BOTTOM_MARGIN + TOOLBAR_PILL_HEIGHT + spacing.sm;
}

type EditMode = 'delete' | 'insert' | 'move' | null;

interface Props {
  currentKey: string;
  isOriginalKey: boolean;
  autoScrollOpen: boolean;
  toolbarStyle?: AnimatedStyle<ViewStyle>;
  editing: boolean;
  editMode: EditMode;
  onPressKey: () => void;
  onPressListen: () => void;
  onPressAutoScroll: () => void;
  onPressFont: () => void;
  onPressEditMove: () => void;
  onPressEditDelete: () => void;
  onPressEditInsert: () => void;
}

export function SongToolbar({
  currentKey,
  isOriginalKey,
  autoScrollOpen,
  toolbarStyle,
  editing,
  editMode,
  onPressKey,
  onPressListen,
  onPressAutoScroll,
  onPressFont,
  onPressEditMove,
  onPressEditDelete,
  onPressEditInsert,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      style={[styles.wrap, { bottom: insets.bottom + TOOLBAR_BOTTOM_MARGIN }, toolbarStyle]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {editing ? (
          <>
            <ToolbarItem
              icon="swap-horizontal"
              label="Trocar"
              accessibilityLabel="Modo mover acorde"
              accent={editMode === 'move'}
              onPress={onPressEditMove}
            />
            <View style={styles.divider} />
            <ToolbarItem
              icon="trash-outline"
              label="Excluir"
              accessibilityLabel="Modo apagar acorde"
              accent={editMode === 'delete'}
              onPress={onPressEditDelete}
            />
            <View style={styles.divider} />
            <ToolbarItem
              icon="add-circle-outline"
              label="Adicionar"
              accessibilityLabel="Modo adicionar acorde"
              accent={editMode === 'insert'}
              onPress={onPressEditInsert}
            />
          </>
        ) : (
          <>
            <ToolbarItem
              icon="key-outline"
              label="Tom"
              badge={currentKey}
              accessibilityLabel={`Mudar tonalidade, actualmente ${currentKey}`}
              accent={!isOriginalKey}
              onPress={onPressKey}
            />
            <View style={styles.divider} />
            <ToolbarItem
              icon="logo-youtube"
              label="Ouvir"
              accessibilityLabel="Ouvir a música no YouTube"
              onPress={onPressListen}
            />
            <View style={styles.divider} />
            <ToolbarItem
              icon={autoScrollOpen ? 'pause-circle-outline' : 'play-circle-outline'}
              label="Rolar"
              accessibilityLabel={
                autoScrollOpen ? 'Fechar rolagem automática' : 'Abrir rolagem automática'
              }
              accent={autoScrollOpen}
              onPress={onPressAutoScroll}
            />
            <View style={styles.divider} />
            <ToolbarItem
              icon="text-outline"
              label="Texto"
              accessibilityLabel="Ajustar tamanho do texto"
              onPress={onPressFont}
            />
          </>
        )}
      </View>
    </Animated.View>
  );
}

interface ItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  accent?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}

function ToolbarItem({ icon, label, badge, accent, accessibilityLabel, onPress }: ItemProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (badge ? `${label}, ${badge}` : label)}
      accessibilityState={{ selected: !!accent }}
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
