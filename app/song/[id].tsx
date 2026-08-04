import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import { SongToolbar, TOOLBAR_BOTTOM_MARGIN, TOOLBAR_PILL_HEIGHT, toolbarBottomOffset } from '@/src/components/song/SongToolbar';
import { UndoSnackbar } from '@/src/components/song/UndoSnackbar';
import { getSongById } from '@/src/data/songs';
import { useDefaultInstrument } from '@/src/hooks/useDefaultInstrument';
import { useFavorites } from '@/src/hooks/useFavorites';
import { useFontSize } from '@/src/hooks/useFontSize';
import { colors, spacing } from '@/src/theme/colors';
import { youtubeSearchUrl } from '@/src/utils/youtube';
import {
  detectOriginalKey,
  extractUniqueChords,
  KEYS,
  noteIndex,
  preferFlats,
  semitonesBetween,
  transposeChord,
} from '@/src/utils/chord-transposer';

// Auto-scroll: velocidade em px/segundo, não px/frame. Em px/frame a rolagem
// anda ao sabor da taxa de refrescamento (num ecrã de 120 Hz ia ao dobro) e
// qualquer frame perdido virava um solavanco; multiplicar pelo tempo real
// decorrido mantém o movimento constante e contínuo.
const MIN_PX_PER_SEC = 3;
const MAX_PX_PER_SEC = 48;
// Um frame muito atrasado (app em segundo plano, GC) não pode virar um salto
// gigante: limitamos o delta de tempo que aceitamos num único frame.
const MAX_FRAME_MS = 64;
// Silêncio de eventos de scroll a partir do qual damos a inércia por terminada
// e retomamos a rolagem automática (rede de segurança para as plataformas que
// não disparam onMomentumScrollEnd quando não houve inércia nenhuma).
const RESUME_AFTER_TOUCH_MS = 150;
const DEFAULT_SCROLL_SPEED = 0.3;

// A letra é montada por fases. No primeiro frame só entra o que cabe no ecrã
// (a música abre instantaneamente); o resto é montado em blocos depois da
// transição de navegação terminar. A partir daí está tudo montado, por isso
// rolar — à mão ou automaticamente — não custa trabalho nenhum à thread de JS.
const INITIAL_ROWS = 14;
const ROW_CHUNK = 24;
// Só os primeiros diagramas do dicionário entram no primeiro frame: são SVGs
// caros e os restantes estão fora do ecrã (a lista é horizontal).
const INITIAL_DIAGRAMS = 4;

// Os créditos entram como a primeira linha para não interromperem o dicionário
// de acordes, que é o único header fixo.
type Row =
  | { key: string; kind: 'credits'; text: string }
  | { key: string; kind: 'line'; line: string; lineIdx: number };

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const songId = parseInt(id ?? '0', 10);
  const song = useMemo(() => getSongById(songId), [songId]);
  const insets = useSafeAreaInsets();

  const { fontSize, changeFont } = useFontSize();
  // A preferência é o ponto de partida, não uma imposição: trocar de instrumento
  // aqui é explorar (ver como fica no teclado), não redefinir o que está nas
  // Definições. Por isso a escolha vale só nesta música e não é gravada. Enquanto
  // `sessionInstrument` for null, a hidratação tardia da preferência chega cá
  // sozinha, sem effect de sincronização.
  const { instrument: defaultInstrument } = useDefaultInstrument();
  const [sessionInstrument, setSessionInstrument] = useState<Instrument | null>(null);
  const instrument = sessionInstrument ?? defaultInstrument;
  const [editing, setEditing] = useState(false);

  const { override, setOverride, clearOverride, hasOverride, isStale, saveFailed } =
    useSongOverride(song?.id, song?.content);
  const effectiveContent = override ?? song?.content ?? '';
  // Os handlers de edição (onDeleteChord, onSelectMoveSource, ...) precisam do
  // conteúdo mais recente, mas não podem depender dele diretamente: isso mudaria
  // a identidade do callback a cada edição e invalidaria o memo() de TODAS as
  // ChordLine, não só da linha editada.
  const effectiveContentRef = useRef(effectiveContent);
  useEffect(() => {
    effectiveContentRef.current = effectiveContent;
  }, [effectiveContent]);

  // Pre-split content + base chord set.
  const lines = useMemo(() => effectiveContent.split('\n'), [effectiveContent]);
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (song?.credits) out.push({ key: 'credits', kind: 'credits', text: song.credits });
    lines.forEach((line, i) => out.push({ key: String(i), kind: 'line', line, lineIdx: i }));
    return out;
  }, [song?.credits, lines]);
  // Fase 1: só o que cabe no ecrã, para o push de navegação não esperar por
  // nada. Fase 2 (depois da transição): o resto entra em blocos, um por frame.
  const [mountedRows, setMountedRows] = useState(INITIAL_ROWS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Esperamos pela transição de navegação para não lhe roubar frames, mas o
    // temporizador garante que o resto da música entra mesmo que algo fique a
    // segurar o InteractionManager (um gesto, por exemplo).
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    const timer = setTimeout(() => setReady(true), 400);
    return () => {
      task.cancel();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready || mountedRows >= rows.length) return;
    const handle = requestAnimationFrame(() =>
      setMountedRows((n) => Math.min(rows.length, n + ROW_CHUNK)),
    );
    return () => cancelAnimationFrame(handle);
  }, [ready, mountedRows, rows.length]);

  const visibleRows = useMemo(
    () => (mountedRows >= rows.length ? rows : rows.slice(0, mountedRows)),
    [rows, mountedRows],
  );

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

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // Estado lido dentro de worklets (tick da rolagem automática e onScroll) —
  // têm de ser shared values, não refs: um ref normal de JS não é seguro de
  // ler/escrever na UI thread.
  const offsetSV = useSharedValue(0);
  const lastScrollYSV = useSharedValue(0);
  const speedSV = useSharedValue(DEFAULT_SCROLL_SPEED);
  const autoScrollOpenSV = useSharedValue(false);
  const autoScrollPlayingSV = useSharedValue(false);
  // Dedo em baixo: o utilizador manda na rolagem.
  const draggingSV = useSharedValue(false);
  // Instante do último evento de scroll ainda causado pelo gesto (inércia);
  // 0 quando não há gesto a decorrer.
  const userScrollAtSV = useSharedValue(0);
  // Limites do conteúdo, para a rolagem automática parar no fim em vez de
  // continuar a somar offset contra um scroll que o nativo já travou (era isso
  // que fazia o scroll dar um salto para trás ao voltar a tocar no ecrã).
  const contentHeightSV = useSharedValue(0);
  const viewportHeightSV = useSharedValue(0);

  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentHeightSV.value = h;
    },
    [contentHeightSV],
  );

  const onScrollViewLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewportHeightSV.value = e.nativeEvent.layout.height;
    },
    [viewportHeightSV],
  );

  // Pill hide/show animation
  const pillTranslateY = useSharedValue(0);
  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillTranslateY.value }],
  }));

  useEffect(() => {
    autoScrollOpenSV.value = autoScrollOpen;
  }, [autoScrollOpen, autoScrollOpenSV]);

  // A barra de velocidade ocupa o lugar da pill, por isso são sempre uma ou a
  // outra. Ficar aqui garante que fecha pelo X também repõe a pill.
  useEffect(() => {
    pillTranslateY.value = withTiming(autoScrollOpen ? TOOLBAR_PILL_HEIGHT + 80 : 0, {
      duration: 250,
    });
  }, [autoScrollOpen, pillTranslateY]);

  // Corre inteiramente na UI thread: nenhum toque em botão fica em fila atrás
  // disto enquanto a rolagem automática está ativa.
  const scrollTick = useFrameCallback((frame) => {
    'worklet';
    // Enquanto o dedo está em baixo, ou a inércia do gesto ainda corre, não
    // mexemos no scroll: o utilizador rola à vontade e a automática retoma
    // sozinha a partir de onde ele parou (offset é reposto em onScroll).
    if (draggingSV.value) return;
    if (userScrollAtSV.value) {
      if (Date.now() - userScrollAtSV.value < RESUME_AFTER_TOUCH_MS) return;
      userScrollAtSV.value = 0;
    }
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16.667, MAX_FRAME_MS);
    const pxPerSec = MIN_PX_PER_SEC + (MAX_PX_PER_SEC - MIN_PX_PER_SEC) * speedSV.value;
    const maxOffset = Math.max(0, contentHeightSV.value - viewportHeightSV.value);
    const next = Math.min(offsetSV.value + (pxPerSec * dt) / 1000, maxOffset);
    if (next === offsetSV.value) return;
    offsetSV.value = next;
    scrollTo(scrollRef, 0, next, false);
  }, false);

  useEffect(() => {
    scrollTick.setActive(autoScrollPlaying);
    autoScrollPlayingSV.value = autoScrollPlaying;
  }, [autoScrollPlaying, scrollTick, autoScrollPlayingSV]);

  // Sheets
  const keySheetRef = useRef<KeySheetHandle>(null);
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

  // Corre inteiramente na UI thread: esconder/mostrar a pill deixou de
  // depender de round-trips para a JS thread a cada evento de scroll.
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - lastScrollYSV.value;
      lastScrollYSV.value = y;

      // Enquanto o tick é o único a mover o scroll, ele já mantém offsetSV
      // certo; re-sincronizar aqui a partir do y reportado (que chega com um
      // pequeno atraso nativo) cria um cabo-de-guerra entre os dois que trava
      // a velocidade — mais visível quanto mais rápido o tick avança por
      // frame. Só repomos offsetSV quando o movimento não é só do tick: dedo
      // em baixo, inércia do gesto a decorrer, ou rolagem automática desligada.
      const tickDriven = autoScrollPlayingSV.value && !draggingSV.value && !userScrollAtSV.value;
      if (!tickDriven) offsetSV.value = y;

      // Mantém a automática em pausa enquanto os eventos ainda vêm do gesto.
      if (draggingSV.value || userScrollAtSV.value) userScrollAtSV.value = Date.now();

      // Com a rolagem automática aberta a pill fica escondida de propósito: os
      // eventos de scroll (incluindo os que ela própria gera) não a podem repor.
      if (autoScrollOpenSV.value) return;

      if (y < 10) {
        if (pillTranslateY.value !== 0) pillTranslateY.value = withTiming(0, { duration: 200 });
      } else if (dy > 8) {
        const target = TOOLBAR_PILL_HEIGHT + 80;
        if (pillTranslateY.value !== target) {
          pillTranslateY.value = withTiming(target, { duration: 200 });
        }
      } else if (dy < -8) {
        if (pillTranslateY.value !== 0) pillTranslateY.value = withTiming(0, { duration: 200 });
      }
    },
    onBeginDrag: () => {
      draggingSV.value = true;
      userScrollAtSV.value = Date.now();
    },
    onEndDrag: () => {
      draggingSV.value = false;
      // Fica a contar: a inércia do gesto ainda pode estar a correr.
      userScrollAtSV.value = Date.now();
    },
    onMomentumEnd: () => {
      userScrollAtSV.value = 0;
    },
  });

  const onSpeedChange = useCallback(
    (v: number) => {
      speedSV.value = v;
    },
    [speedSV],
  );

  const onChangeFont = useCallback((delta: number) => {
    changeFont(delta);
  }, [changeFont]);

  const onPressKey = useCallback(() => keySheetRef.current?.present(), []);
  // Sai da app de propósito: o YouTube passa a correr na aplicação dele ou no
  // browser, onde funciona sempre e é o que os termos deles permitem.
  const onPressListen = useCallback(() => {
    if (!song) return;
    Linking.openURL(youtubeSearchUrl(song.title)).catch(() => {
      Alert.alert(
        'Não foi possível abrir o YouTube',
        'Não há nenhuma aplicação neste dispositivo capaz de abrir a ligação.',
      );
    });
  }, [song]);
  const onPressFont = useCallback(() => fontSheetRef.current?.present(), []);
  const onPressAutoScroll = useCallback(() => {
    const next = !autoScrollOpenSV.value;
    setAutoScrollOpen(next);
    setAutoScrollPlaying(next);
  }, [autoScrollOpenSV]);
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
      const linesNow = effectiveContentRef.current.split('\n');
      const target = linesNow[lineIdx];
      if (target == null) return;
      const segs = parseLine(target);
      const next = deleteChordAt(segs, segIdx);
      linesNow[lineIdx] = serializeLine(next);
      setUndoSnapshot(effectiveContentRef.current);
      setOverride(linesNow.join('\n'));
    },
    [setOverride],
  );

  const onInsertChord = useCallback(
    (lineIdx: number, segIdx: number, charOffset: number) => {
      pendingInsert.current = { lineIdx, segIdx, charOffset };
      chordPickerRef.current?.present();
    },
    [],
  );

  const onSelectMoveSource = useCallback((lineIdx: number, segIdx: number) => {
    const linesNow = effectiveContentRef.current.split('\n');
    const target = linesNow[lineIdx];
    if (target == null) return;
    const segs = parseLine(target);
    const chord = segs[segIdx]?.chord;
    if (!chord) return;
    setMovingChord({ lineIdx, segIdx, chord });
  }, []);

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
      const linesNow = effectiveContentRef.current.split('\n');

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

      setUndoSnapshot(effectiveContentRef.current);
      setOverride(linesNow.join('\n'));
      setMovingChord(null);
    },
    [movingChord, setOverride],
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
      const linesNow = effectiveContentRef.current.split('\n');
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
      setUndoSnapshot(effectiveContentRef.current);
      setOverride(linesNow.join('\n'));
    },
    [originalKey, transposeSemitones, setOverride],
  );

  const isMovingActive = editMode === 'move' && movingChord != null;
  const deleteHandler = editMode === 'delete' ? onDeleteChord : undefined;
  const insertHandler = editMode === 'insert' ? onInsertChord : undefined;
  const moveSourceHandler = editMode === 'move' ? onSelectMoveSource : undefined;
  const moveToHandler = editMode === 'move' ? onMoveTo : undefined;

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

  // A edição guardada baseia-se numa versão do hinário que entretanto mudou.
  // Avisamos em vez de deixar o utilizador preso a texto desactualizado.
  const onDiscardStale = useCallback(() => {
    Alert.alert(
      'Esta música foi actualizada',
      'A tua versão editada baseia-se numa versão anterior. Queres descartar as tuas edições e usar a versão actualizada?',
      [
        { text: 'Manter a minha', style: 'cancel' },
        {
          text: 'Usar a actualizada',
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
                <Pressable
                  hitSlop={12}
                  onPress={onResetEdits}
                  accessibilityRole="button"
                  accessibilityLabel="Repor a versão original da música"
                >
                  <Ionicons name="refresh" size={20} color={colors.textMuted} />
                </Pressable>
              ) : null}
              <Pressable
                hitSlop={12}
                onPress={onToggleEditing}
                accessibilityRole="button"
                accessibilityLabel={editing ? 'Concluir edição de acordes' : 'Editar acordes'}
                accessibilityState={{ selected: editing }}
              >
                <Ionicons
                  name={editing ? 'checkmark' : 'create-outline'}
                  size={22}
                  color={editing ? colors.inTune : colors.text}
                />
              </Pressable>
              <Pressable
                hitSlop={12}
                onPress={onToggleFav}
                accessibilityRole="button"
                accessibilityLabel={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                accessibilityState={{ selected: fav }}
              >
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

      {saveFailed ? (
        <View style={styles.saveFailedBanner} accessibilityLiveRegion="polite">
          <Ionicons name="warning-outline" size={18} color={colors.background} />
          <Text style={styles.saveFailedText}>
            Não foi possível guardar esta edição. Continua visível agora, mas
            pode perder-se se fechares a aplicação.
          </Text>
        </View>
      ) : null}

      {isStale ? (
        <Pressable
          style={styles.staleBanner}
          onPress={onDiscardStale}
          accessibilityRole="button"
          accessibilityLabel="Esta música foi atualizada. Toca para rever as tuas edições."
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.background} />
          <Text style={styles.staleBannerText} numberOfLines={2}>
            Esta música foi atualizada. As tuas edições baseiam-se numa versão anterior.
          </Text>
          <Text style={styles.staleBannerAction}>Rever</Text>
        </Pressable>
      ) : null}

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

      {/* Sem virtualização de propósito: a música mais longa do hinário tem
          128 linhas, e mantê-las todas montadas é o que torna a rolagem —
          sobretudo a automática a alta velocidade — perfeitamente contínua.
          Uma lista virtualizada teria de montar células novas a meio da
          rolagem, na thread de JS, e era isso que provocava o travamento. O
          custo de as montar é pago uma vez, em blocos, depois de abrir. */}
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        onLayout={onScrollViewLayout}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0]}
      >
        <ChordDictionary
          chords={uniqueChords}
          diagramLimit={ready ? undefined : INITIAL_DIAGRAMS}
          instrument={instrument}
          onChangeInstrument={setSessionInstrument}
          onPressChord={onChordPress}
        />

        {visibleRows.map((row, index) => {
          const rowStyle = index === 0 ? rowPadFirstStyle : styles.rowPad;
          if (row.kind === 'credits') {
            return (
              <Text key={row.key} style={[styles.credits, rowStyle]}>
                {row.text}
              </Text>
            );
          }
          const i = row.lineIdx;
          return (
            <View key={row.key} style={rowStyle}>
              <ChordLine
                line={row.line}
                lineIdx={i}
                fontSize={fontSize}
                transpose={transposeSemitones}
                targetKey={currentKey}
                onChordPress={onChordPress}
                editing={editing}
                onDeleteChord={deleteHandler}
                onInsertChord={insertHandler}
                selectingMoveSource={selectingMove}
                onSelectMoveSource={moveSourceHandler}
                isMoving={isMovingActive}
                movingFromSegIdx={
                  editMode === 'move' && movingChord?.lineIdx === i ? movingChord.segIdx : undefined
                }
                onMoveTo={moveToHandler}
              />
            </View>
          );
        })}

        <View style={styles.footerSpacer} />
      </Animated.ScrollView>

      <AutoScrollBar
        visible={autoScrollOpen}
        playing={autoScrollPlaying}
        defaultSpeed={DEFAULT_SCROLL_SPEED}
        bottomOffset={insets.bottom + TOOLBAR_BOTTOM_MARGIN}
        onTogglePlay={onTogglePlay}
        onSpeedChange={onSpeedChange}
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
  rowPad: {
    paddingHorizontal: spacing.lg,
  },
  rowPadFirst: {
    paddingTop: spacing.lg,
  },
  footerSpacer: {
    height: spacing.lg + 120,
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
  saveFailedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.danger,
    gap: spacing.sm,
  },
  saveFailedText: {
    flex: 1,
    color: colors.background,
    fontSize: 13,
    fontWeight: '600',
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    gap: spacing.sm,
  },
  staleBannerText: {
    flex: 1,
    color: colors.background,
    fontSize: 13,
    fontWeight: '600',
  },
  staleBannerAction: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
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

// Fora do render: um array de estilos criado a cada render forçava a primeira
// linha a re-renderizar sem necessidade.
const rowPadFirstStyle = [styles.rowPad, styles.rowPadFirst];
