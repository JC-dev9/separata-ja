import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROW_HEIGHT, SongListItem } from '@/src/components/SongListItem';
import { IndexedSong, loadSongs, searchTerm } from '@/src/data/songs';
import { useFavorites } from '@/src/hooks/useFavorites';
import { colors, radius, spacing } from '@/src/theme/colors';

const ITEM_STRIDE = ROW_HEIGHT + spacing.sm;

export default function HomeScreen() {
  const router = useRouter();
  const songs = useMemo(() => loadSongs(), []);
  const [query, setQuery] = useState('');
  const { isFavorite, toggle } = useFavorites();

  const filtered = useMemo(() => {
    const q = searchTerm(query);
    if (!q) return songs;
    return songs.filter((s) => s.searchIndex.includes(q));
  }, [songs, query]);

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
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.search}
          placeholder="Buscar por título ou autor…"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Buscar músicas por título ou autor"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          inputMode="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Limpar pesquisa"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>
        {query
          ? `RESULTADOS · ${filtered.length} ${filtered.length === 1 ? 'hino' : 'hinos'}`
          : `HINÁRIO COMPLETO · ${songs.length} hinos`}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={28} color={colors.textDim} />
            <Text style={styles.emptyTitle}>Nenhum hino encontrado</Text>
            <Text style={styles.emptyHint}>
              Tenta outro título ou autor.
            </Text>
          </View>
        }
      />
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    height: 44,
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
