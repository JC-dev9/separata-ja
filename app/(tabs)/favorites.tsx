import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROW_HEIGHT, SongListItem } from '@/src/components/SongListItem';
import { IndexedSong, loadSongs } from '@/src/data/songs';
import { useFavorites } from '@/src/hooks/useFavorites';
import { colors, spacing } from '@/src/theme/colors';

const ITEM_STRIDE = ROW_HEIGHT + spacing.sm;

export default function FavoritesScreen() {
  const router = useRouter();
  const songs = useMemo(() => loadSongs(), []);
  const { favorites, isFavorite, toggle } = useFavorites();

  const filtered = useMemo(
    () => songs.filter((s) => favorites.has(s.id)),
    [songs, favorites],
  );

  const openSong = useCallback(
    (id: number) => router.push(`/song/${id}`),
    [router],
  );

  const renderItem = useCallback<ListRenderItem<IndexedSong>>(
    ({ item }) => (
      <SongListItem
        song={item}
        isFavorite={isFavorite(item.id)}
        onPress={openSong}
        onToggleFavorite={toggle}
      />
    ),
    [isFavorite, openSong, toggle],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<IndexedSong> | null | undefined, index: number) => ({
      length: ITEM_STRIDE,
      offset: ITEM_STRIDE * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="heart-outline" size={36} color={colors.textDim} />
          <Text style={styles.emptyTitle}>Sem favoritos ainda</Text>
          <Text style={styles.emptyHint}>
            Toca no coração ao lado de uma música para guardá-la aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={9}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
}

function keyExtractor(s: IndexedSong) {
  return String(s.id);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
