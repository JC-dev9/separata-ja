import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChordLine } from '@/src/components/ChordLine';
import { AutoScrollBar } from '@/src/components/song/AutoScrollBar';
import {
  ChordDetailSheet,
  ChordDetailSheetHandle,
} from '@/src/components/song/ChordDetailSheet';
import { ChordDictionary, Instrument } from '@/src/components/song/ChordDictionary';
import { FontSheet, FontSheetHandle } from '@/src/components/song/FontSheet';
import { KeySheet, KeySheetHandle } from '@/src/components/song/KeySheet';
import { ListenSheet, ListenSheetHandle } from '@/src/components/song/ListenSheet';
import { SongToolbar, TOOLBAR_BOTTOM_MARGIN, TOOLBAR_PILL_HEIGHT, toolbarBottomOffset } from '@/src/components/song/SongToolbar';
import { getSongById } from '@/src/data/songs';
import { useFavorites } from '@/src/hooks/useFavorites';
import { useFontSize } from '@/src/hooks/useFontSize';
import { colors, spacing } from '@/src/theme/colors';
import {
  detectOriginalKey,
  extractUniqueChords,
  KEYS,
  noteIndex,
  preferFlats,
  semitonesBetween,
  transposeChord,
} from '@/src/utils/chord-transposer';

// Auto-scroll: speed range tuned so 0 ≈ 0.05 px/frame, 1 ≈ 0.8 px/frame.
const MIN_PX_PER_FRAME = 0.05;
const MAX_PX_PER_FRAME = 0.8;

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const songId = parseInt(id ?? '0', 10);
  const song = useMemo(() => getSongById(songId), [songId]);
  const insets = useSafeAreaInsets();

  const { fontSize, changeFont } = useFontSize();
  const [instrument, setInstrument] = useState<Instrument>('guitar');

  // Pre-split content + base chord set. These only depend on the song.
  const lines = useMemo(() => (song ? song.content.split('\n') : []), [song]);
  const baseChords = useMemo(
    () => (song ? extractUniqueChords(song.content) : []),
    [song],
  );
  const originalKey = useMemo(
    () => (song ? detectOriginalKey(song.content) : 'C'),
    [song],
  );

  const [currentKey, setCurrentKey] = useState(originalKey);
  useEffect(() => setCurrentKey(originalKey), [originalKey]);

  const transposeSemitones = useMemo(
    () => semitonesBetween(originalKey, currentKey),
    [originalKey, currentKey],
  );
  const isOriginalKey = transposeSemitones === 0;

  const uniqueChords = useMemo(() => {
    const useFlats = preferFlats(currentKey);
    const set = new Set<string>();
    baseChords.forEach((c) => {
      set.add(transposeChord(c, transposeSemitones, useFlats ? 'F' : currentKey));
    });
    return Array.from(set);
  }, [baseChords, transposeSemitones, currentKey]);

  // Auto-scroll
  const [autoScrollOpen, setAutoScrollOpen] = useState(false);
  const [autoScrollPlaying, setAutoScrollPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0.3);

  const scrollRef = useRef<ScrollView>(null);
  const offset = useRef(0);
  const lastScrollY = useRef(0);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef(scrollSpeed);

  // Pill hide/show animation
  const pillTranslateY = useSharedValue(0);
  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillTranslateY.value }],
  }));
  speedRef.current = scrollSpeed;

  useEffect(() => {
    if (!autoScrollPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      const px =
        MIN_PX_PER_FRAME + (MAX_PX_PER_FRAME - MIN_PX_PER_FRAME) * speedRef.current;
      offset.current += px;
      scrollRef.current?.scrollTo({ y: offset.current, animated: false });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [autoScrollPlaying]);

  // Sheets
  const keySheetRef = useRef<KeySheetHandle>(null);
  const listenSheetRef = useRef<ListenSheetHandle>(null);
  const chordDetailRef = useRef<ChordDetailSheetHandle>(null);
  const fontSheetRef = useRef<FontSheetHandle>(null);

  const { isFavorite, toggle } = useFavorites();

  // Stable handler so memoized ChordLines don't re-render when other state changes.
  const onChordPress = useCallback((c: string) => {
    chordDetailRef.current?.present(c);
  }, []);

  const onShiftSemitone = useCallback(
    (delta: number) => {
      const idx = noteIndex(currentKey);
      const newIdx = ((idx + delta) % 12 + 12) % 12;
      const useFlats = preferFlats(currentKey);
      const candidates = KEYS.filter((k) => noteIndex(k) === newIdx);
      const next =
        candidates.find((k) => (useFlats ? k.endsWith('b') || !k.includes('#') : !k.endsWith('b'))) ??
        candidates[0];
      setCurrentKey(next);
    },
    [currentKey],
  );

  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;
    offset.current = y;

    if (y < 10) {
      pillTranslateY.value = withTiming(0, { duration: 200 });
    } else if (dy > 8) {
      pillTranslateY.value = withTiming(TOOLBAR_PILL_HEIGHT + 80, { duration: 200 });
    } else if (dy < -8) {
      pillTranslateY.value = withTiming(0, { duration: 200 });
    }
  }, [pillTranslateY]);

  const onChangeFont = useCallback((delta: number) => {
    changeFont(delta);
  }, [changeFont]);

  const onPressKey = useCallback(() => keySheetRef.current?.present(), []);
  const onPressListen = useCallback(() => listenSheetRef.current?.present(), []);
  const onPressFont = useCallback(() => fontSheetRef.current?.present(), []);
  const onPressAutoScroll = useCallback(() => {
    setAutoScrollOpen((v) => {
      const next = !v;
      pillTranslateY.value = withTiming(next ? TOOLBAR_PILL_HEIGHT + 80 : 0, { duration: 250 });
      if (next) setAutoScrollPlaying(true);
      else setAutoScrollPlaying(false);
      return next;
    });
  }, [pillTranslateY]);
  const onTogglePlay = useCallback(() => setAutoScrollPlaying((v) => !v), []);
  const onCloseAutoScroll = useCallback(() => {
    setAutoScrollPlaying(false);
    setAutoScrollOpen(false);
  }, []);
  const onRestoreKey = useCallback(() => setCurrentKey(originalKey), [originalKey]);

  const fav = song ? isFavorite(song.id) : false;
  const songIdSafe = song?.id;
  const onToggleFav = useCallback(() => {
    if (songIdSafe != null) toggle(songIdSafe);
  }, [songIdSafe, toggle]);

  if (!song) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Música não encontrada.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${String(song.number).padStart(2, '0')}. ${song.title}`,
          headerRight: () => (
            <Pressable hitSlop={12} onPress={onToggleFav}>
              <Ionicons
                name={fav ? 'heart' : 'heart-outline'}
                size={22}
                color={fav ? colors.danger : colors.text}
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={32}
        stickyHeaderIndices={[0]}
        removeClippedSubviews
      >
        <ChordDictionary
          chords={uniqueChords}
          instrument={instrument}
          onChangeInstrument={setInstrument}
          onPressChord={onChordPress}
        />

        <View style={styles.lyricsWrap}>
          {song.credits ? <Text style={styles.credits}>{song.credits}</Text> : null}
          {lines.map((line, i) => (
            <ChordLine
              key={i}
              line={line}
              fontSize={fontSize}
              transpose={transposeSemitones}
              targetKey={currentKey}
              onChordPress={onChordPress}
            />
          ))}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <AutoScrollBar
        visible={autoScrollOpen}
        playing={autoScrollPlaying}
        speed={scrollSpeed}
        bottomOffset={insets.bottom + TOOLBAR_BOTTOM_MARGIN}
        onTogglePlay={onTogglePlay}
        onSpeedChange={setScrollSpeed}
        onClose={onCloseAutoScroll}
      />

      <SongToolbar
        currentKey={currentKey}
        isOriginalKey={isOriginalKey}
        autoScrollOpen={autoScrollOpen}
        toolbarStyle={pillAnimatedStyle}
        onPressKey={onPressKey}
        onPressListen={onPressListen}
        onPressAutoScroll={onPressAutoScroll}
        onPressFont={onPressFont}
      />

      <KeySheet
        ref={keySheetRef}
        originalKey={originalKey}
        currentKey={currentKey}
        onSelectKey={setCurrentKey}
        onShiftSemitone={onShiftSemitone}
        onRestore={onRestoreKey}
      />

      <ListenSheet ref={listenSheetRef} songTitle={song.title} />

      <FontSheet ref={fontSheetRef} fontSize={fontSize} onChangeFont={onChangeFont} />

      <ChordDetailSheet ref={chordDetailRef} defaultInstrument={instrument} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  content: {
    paddingBottom: 0,
  },
  lyricsWrap: {
    padding: spacing.lg,
  },
  credits: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontSize: 12,
    marginBottom: spacing.md,
  },
});
