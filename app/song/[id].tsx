import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChordLine } from '@/src/components/ChordLine';
import { deleteChordAt, insertChordAt, parseLine, serializeLine } from '@/src/utils/chord-parser';
import { useSongOverride } from '@/src/hooks/useSongOverride';
import { ChordPickerSheet, ChordPickerSheetHandle } from '@/src/components/song/ChordPickerSheet';
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
import { UndoSnackbar } from '@/src/components/song/UndoSnackbar';
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
  const [editing, setEditing] = useState(false);

  const { override, setOverride, clearOverride, hasOverride } = useSongOverride(song?.id);
  const effectiveContent = override ?? song?.content ?? '';

  // Pre-split content + base chord set.
  const lines = useMemo(() => effectiveContent.split('\n'), [effectiveContent]);
  const baseChords = useMemo(
    () => (effectiveContent ? extractUniqueChords(effectiveContent) : []),
    [effectiveContent],
  );
  const originalKey = useMemo(
    () => (effectiveContent ? detectOriginalKey(effectiveContent) : 'C'),
    [effectiveContent],
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

  const [undoSnapshot, setUndoSnapshot] = useState<string | null>(null);
  const [movingChord, setMovingChord] = useState<{ lineIdx: number; segIdx: number; chord: string } | null>(null);
  const [editMode, setEditMode] = useState<'delete' | 'insert' | 'move' | null>(null);
  const selectingMove = editMode === 'move' && movingChord === null;
  const chordPickerRef = useRef<ChordPickerSheetHandle>(null);
  const pendingInsert = useRef<{ lineIdx: number; segIdx: number; charOffset: number } | null>(null);

  const onDeleteChord = useCallback(
    (lineIdx: number, segIdx: number) => {
      const linesNow = effectiveContent.split('\n');
      const target = linesNow[lineIdx];
      if (target == null) return;
      const segs = parseLine(target);
      const next = deleteChordAt(segs, segIdx);
      linesNow[lineIdx] = serializeLine(next);
      setUndoSnapshot(effectiveContent);
      setOverride(linesNow.join('\n'));
    },
    [effectiveContent, setOverride],
  );

  const onInsertChord = useCallback(
    (lineIdx: number, segIdx: number, charOffset: number) => {
      pendingInsert.current = { lineIdx, segIdx, charOffset };
      chordPickerRef.current?.present();
    },
    [],
  );

  const onSelectMoveSource = useCallback(
    (lineIdx: number, segIdx: number) => {
      const linesNow = effectiveContent.split('\n');
      const target = linesNow[lineIdx];
      if (target == null) return;
      const segs = parseLine(target);
      const chord = segs[segIdx]?.chord;
      if (!chord) return;
      setMovingChord({ lineIdx, segIdx, chord });
    },
    [effectiveContent],
  );

  const onCancelMove = useCallback(() => {
    if (movingChord) {
      setMovingChord(null); // volta a seleccionar origem, mantém modo move
    } else {
      setEditMode(null); // sai do modo move
    }
  }, [movingChord]);

  const onPressEditMove = useCallback(() => {
    setEditMode((prev) => {
      setMovingChord(null);
      return prev === 'move' ? null : 'move';
    });
  }, []);

  const onPressEditDelete = useCallback(() => {
    setEditMode((prev) => (prev === 'delete' ? null : 'delete'));
  }, []);

  const onPressEditInsert = useCallback(() => {
    setEditMode((prev) => (prev === 'insert' ? null : 'insert'));
  }, []);

  const onMoveTo = useCallback(
    (toLineIdx: number, toSegIdx: number, charOffset: number) => {
      const from = movingChord;
      if (!from) return;
      const linesNow = effectiveContent.split('\n');

      if (from.lineIdx === toLineIdx) {
        const segs = parseLine(linesNow[from.lineIdx]);
        // "Neutraliza" o acorde na origem (mantém texto, mesmo segmento)
        // para não desalinhar os índices ao inserir.
        const neutralized = segs.map((s, i) =>
          i === from.segIdx ? { chord: '', text: s.text } : s,
        );
        const inserted = insertChordAt(neutralized, toSegIdx, charOffset, from.chord);
        linesNow[from.lineIdx] = serializeLine(inserted);
      } else {
        const fromSegs = parseLine(linesNow[from.lineIdx]);
        linesNow[from.lineIdx] = serializeLine(deleteChordAt(fromSegs, from.segIdx));
        const toSegs = parseLine(linesNow[toLineIdx]);
        linesNow[toLineIdx] = serializeLine(
          insertChordAt(toSegs, toSegIdx, charOffset, from.chord),
        );
      }

      setUndoSnapshot(effectiveContent);
      setOverride(linesNow.join('\n'));
      setMovingChord(null);
    },
    [movingChord, effectiveContent, setOverride],
  );

  // O acorde a mostrar no banner é a versão transposta para a tonalidade actual.
  const movingChordDisplay = useMemo(() => {
    if (!movingChord) return null;
    return transposeChord(movingChord.chord, transposeSemitones, currentKey);
  }, [movingChord, transposeSemitones, currentKey]);

  const onPickChord = useCallback(
    (chord: string) => {
      const pending = pendingInsert.current;
      pendingInsert.current = null;
      if (!pending) return;
      const linesNow = effectiveContent.split('\n');
      const target = linesNow[pending.lineIdx];
      if (target == null) return;
      const segs = parseLine(target);
      // O acorde escrito é na tonalidade actual; precisamos guardá-lo na
      // tonalidade original para que a transposição continue a funcionar.
      const useFlats = preferFlats(originalKey);
      const inOriginalKey = transposeChord(
        chord,
        -transposeSemitones,
        useFlats ? 'F' : originalKey,
      );
      const next = insertChordAt(segs, pending.segIdx, pending.charOffset, inOriginalKey);
      linesNow[pending.lineIdx] = serializeLine(next);
      setUndoSnapshot(effectiveContent);
      setOverride(linesNow.join('\n'));
    },
    [effectiveContent, originalKey, transposeSemitones, setOverride],
  );

  const onUndoDelete = useCallback(() => {
    if (undoSnapshot == null) return;
    if (song && undoSnapshot === song.content) clearOverride();
    else setOverride(undoSnapshot);
    setUndoSnapshot(null);
  }, [undoSnapshot, song, clearOverride, setOverride]);

  const onDismissUndo = useCallback(() => setUndoSnapshot(null), []);

  const onToggleEditing = useCallback(() => {
    setEditing((v) => {
      const next = !v;
      if (!next) {
        setMovingChord(null);
        setEditMode(null);
      }
      return next;
    });
  }, []);
  const onResetEdits = useCallback(() => {
    Alert.alert(
      'Voltar ao original?',
      'Todas as tuas edições nesta música serão perdidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Voltar ao original',
          style: 'destructive',
          onPress: () => {
            clearOverride();
            setEditing(false);
          },
        },
      ],
    );
  }, [clearOverride]);

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
            <View style={styles.headerRight}>
              {hasOverride ? (
                <Pressable hitSlop={12} onPress={onResetEdits}>
                  <Ionicons name="refresh" size={20} color={colors.textMuted} />
                </Pressable>
              ) : null}
              <Pressable hitSlop={12} onPress={onToggleEditing}>
                <Ionicons
                  name={editing ? 'checkmark' : 'create-outline'}
                  size={22}
                  color={editing ? colors.inTune : colors.text}
                />
              </Pressable>
              <Pressable hitSlop={12} onPress={onToggleFav}>
                <Ionicons
                  name={fav ? 'heart' : 'heart-outline'}
                  size={22}
                  color={fav ? colors.danger : colors.text}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      {selectingMove || movingChord ? (
        <View style={styles.moveBanner}>
          <Text style={styles.moveBannerText} numberOfLines={1}>
            {selectingMove ? (
              'Toca no acorde que queres mover'
            ) : (
              <>
                A mover <Text style={styles.moveBannerChord}>{movingChordDisplay}</Text> — toca onde queres colocá-lo
              </>
            )}
          </Text>
          <Pressable hitSlop={8} onPress={onCancelMove}>
            <Text style={styles.moveBannerCancel}>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}

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
              lineIdx={i}
              fontSize={fontSize}
              transpose={transposeSemitones}
              targetKey={currentKey}
              onChordPress={onChordPress}
              editing={editing}
              onDeleteChord={editMode === 'delete' ? onDeleteChord : undefined}
              onInsertChord={editMode === 'insert' ? onInsertChord : undefined}
              selectingMoveSource={selectingMove}
              onSelectMoveSource={editMode === 'move' ? onSelectMoveSource : undefined}
              isMoving={editMode === 'move' && movingChord != null}
              movingFromSegIdx={editMode === 'move' && movingChord?.lineIdx === i ? movingChord.segIdx : undefined}
              onMoveTo={editMode === 'move' ? onMoveTo : undefined}
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

      <UndoSnackbar
        visible={undoSnapshot != null}
        message="Acorde apagado"
        bottomOffset={toolbarBottomOffset(insets.bottom) + TOOLBAR_PILL_HEIGHT + 12}
        onUndo={onUndoDelete}
        onDismiss={onDismissUndo}
      />

      <SongToolbar
        currentKey={currentKey}
        isOriginalKey={isOriginalKey}
        autoScrollOpen={autoScrollOpen}
        toolbarStyle={pillAnimatedStyle}
        editing={editing}
        editMode={editMode}
        onPressKey={onPressKey}
        onPressListen={onPressListen}
        onPressAutoScroll={onPressAutoScroll}
        onPressFont={onPressFont}
        onPressEditMove={onPressEditMove}
        onPressEditDelete={onPressEditDelete}
        onPressEditInsert={onPressEditInsert}
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

      <ChordPickerSheet
        ref={chordPickerRef}
        suggestions={uniqueChords}
        onPick={onPickChord}
      />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  moveBannerText: {
    flex: 1,
    color: colors.text,
  },
  moveBannerChord: {
    color: colors.accent,
    fontWeight: '700',
  },
  moveBannerCancel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
