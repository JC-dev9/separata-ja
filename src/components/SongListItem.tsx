import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';
import { Song } from '@/src/types/song';

export const ROW_HEIGHT = 76;

interface Props {
  song: Song;
  numberLabel?: string;
  isFavorite: boolean;
  onPress: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

function SongListItemBase({ song, numberLabel, isFavorite, onPress, onToggleFavorite }: Props) {
  const handlePress = useCallback(() => onPress(song.id), [onPress, song.id]);
  const handleHeart = useCallback(() => onToggleFavorite(song.id), [onToggleFavorite, song.id]);

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: colors.surfaceElevated }}
      accessibilityRole="button"
      accessibilityLabel={`Hino ${song.number}, ${song.title}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.numberBox}>
        <Text style={styles.number}>{numberLabel ?? String(song.number).padStart(2, '0')}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        {song.credits ? (
          <Text style={styles.credits} numberOfLines={1}>
            {song.credits}
          </Text>
        ) : null}
      </View>
      <Pressable
        hitSlop={12}
        onPress={handleHeart}
        accessibilityRole="button"
        accessibilityLabel={
          isFavorite ? `Remover ${song.title} dos favoritos` : `Adicionar ${song.title} aos favoritos`
        }
        style={styles.heart}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={22}
          color={isFavorite ? colors.danger : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

export const SongListItem = memo(SongListItemBase);

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  numberBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  number: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  credits: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  heart: {
    padding: spacing.sm,
  },
});
