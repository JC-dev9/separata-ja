import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Segment, parseLine } from '@/src/utils/chord-parser';
import { transposeChord } from '@/src/utils/chord-transposer';
import { colors } from '@/src/theme/colors';

interface Props {
  line: string;
  lineIdx?: number;
  fontSize: number;
  transpose: number;
  targetKey?: string;
  onChordPress?: (chord: string) => void;
  editing?: boolean;
  onDeleteChord?: (lineIdx: number, segIdx: number) => void;
  onInsertChord?: (lineIdx: number, segIdx: number, charOffset: number) => void;
  selectingMoveSource?: boolean;
  onSelectMoveSource?: (lineIdx: number, segIdx: number) => void;
  isMoving?: boolean;
  movingFromSegIdx?: number;
  onMoveTo?: (lineIdx: number, segIdx: number, charOffset: number) => void;
}

function ChordLineBase({
  line,
  lineIdx = 0,
  fontSize,
  transpose,
  targetKey,
  onChordPress,
  editing,
  onDeleteChord,
  onInsertChord,
  selectingMoveSource,
  onSelectMoveSource,
  isMoving,
  movingFromSegIdx,
  onMoveTo,
}: Props) {
  if (line.trim() === '') {
    return <View style={{ height: fontSize * 0.8 }} />;
  }

  const segments = parseLine(line);
  const chordHeight = fontSize * 1.2;
  const lineHeight = fontSize * 1.5;

  const onlyChords = segments.every((s) => s.text.trim() === '' && s.chord !== '');

  if (onlyChords) {
    return (
      <View style={[styles.row, { marginBottom: 4 }]}>
        {segments.map((seg, i) => {
          const chord = transposeChord(seg.chord, transpose, targetKey);
          const isMovingThis = isMoving && movingFromSegIdx === i;
          const onPress = editing
            ? selectingMoveSource
              ? onSelectMoveSource
                ? () => onSelectMoveSource(lineIdx, i)
                : undefined
              : isMoving
                ? undefined
                : onDeleteChord
                  ? () => onDeleteChord(lineIdx, i)
                  : undefined
            : onChordPress
              ? () => onChordPress(chord)
              : undefined;
          return (
            <ChordChip
              key={i}
              chord={chord}
              fontSize={fontSize * 0.9}
              onPress={onPress}
              standalone
              editing={editing}
              moving={isMovingThis}
              selecting={selectingMoveSource}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.row, { minHeight: lineHeight + chordHeight }]}>
      {segments.map((seg, i) => (
        <ChordSegment
          key={i}
          seg={seg}
          segIdx={i}
          lineIdx={lineIdx}
          fontSize={fontSize}
          transpose={transpose}
          targetKey={targetKey}
          chordHeight={chordHeight}
          lineHeight={lineHeight}
          onChordPress={onChordPress}
          editing={editing}
          onDeleteChord={onDeleteChord}
          onInsertChord={onInsertChord}
          selectingMoveSource={selectingMoveSource}
          onSelectMoveSource={onSelectMoveSource}
          isMoving={isMoving}
          movingFromSegIdx={movingFromSegIdx}
          onMoveTo={onMoveTo}
        />
      ))}
    </View>
  );
}

interface SegmentProps {
  seg: Segment;
  segIdx: number;
  lineIdx: number;
  fontSize: number;
  transpose: number;
  targetKey?: string;
  chordHeight: number;
  lineHeight: number;
  onChordPress?: (chord: string) => void;
  editing?: boolean;
  onDeleteChord?: (lineIdx: number, segIdx: number) => void;
  onInsertChord?: (lineIdx: number, segIdx: number, charOffset: number) => void;
  selectingMoveSource?: boolean;
  onSelectMoveSource?: (lineIdx: number, segIdx: number) => void;
  isMoving?: boolean;
  movingFromSegIdx?: number;
  onMoveTo?: (lineIdx: number, segIdx: number, charOffset: number) => void;
}

function tokenizePreservingSpaces(text: string) {
  const out: { text: string; offset: number; isSpace: boolean }[] = [];
  const re = /\S+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ text: m[0], offset: m.index, isSpace: /^\s+$/.test(m[0]) });
  }
  return out;
}

function ChordSegment({
  seg,
  segIdx,
  lineIdx,
  fontSize,
  transpose,
  targetKey,
  chordHeight,
  lineHeight,
  onChordPress,
  editing,
  onDeleteChord,
  onInsertChord,
  selectingMoveSource,
  onSelectMoveSource,
  isMoving,
  movingFromSegIdx,
  onMoveTo,
}: SegmentProps) {
  const transposed = seg.chord ? transposeChord(seg.chord, transpose, targetKey) : '';

  const isMovingThis = isMoving && movingFromSegIdx === segIdx;

  // Em modo edição, dividimos o texto em palavras: a primeira palavra fica
  // com o acorde do segmento por cima (se existir); as restantes ficam como
  // alvos para inserir (+) ou para receber um acorde que está a ser movido (↓).
  if (editing && seg.text.length > 0 && (onInsertChord || (isMoving && onMoveTo))) {
    const tokens = tokenizePreservingSpaces(seg.text);
    const firstNonSpaceIdx = tokens.findIndex((t) => !t.isSpace);

    return (
      <>
        {tokens.map((tok, i) => {
          if (tok.isSpace) {
            return (
              <View key={i} style={styles.segment}>
                <Text style={{ height: chordHeight, lineHeight: chordHeight }}> </Text>
                <Text style={{ color: colors.text, fontSize, lineHeight }}>{tok.text}</Text>
              </View>
            );
          }

          const ownsChord = !!seg.chord && i === firstNonSpaceIdx;

          if (ownsChord) {
            const chordPress = selectingMoveSource
              ? onSelectMoveSource
                ? () => onSelectMoveSource(lineIdx, segIdx)
                : undefined
              : isMoving
                ? undefined
                : onDeleteChord
                  ? () => onDeleteChord(lineIdx, segIdx)
                  : undefined;
            return (
              <View key={i} style={styles.segment}>
                <ChordChip
                  chord={transposed}
                  fontSize={fontSize * 0.85}
                  height={chordHeight}
                  onPress={chordPress}
                  editing={editing}
                  moving={isMovingThis}
                  selecting={selectingMoveSource}
                />
                <Text style={{ color: colors.text, fontSize, lineHeight }}>{tok.text}</Text>
              </View>
            );
          }

          // Em modo "seleccionar origem" só os acordes reagem; palavras ficam inertes.
          if (selectingMoveSource) {
            return (
              <View key={i} style={styles.segment}>
                <Text style={{ height: chordHeight, lineHeight: chordHeight }}> </Text>
                <Text style={{ color: colors.text, fontSize, lineHeight }}>{tok.text}</Text>
              </View>
            );
          }

          const handlePress = () => {
            if (isMoving && onMoveTo) onMoveTo(lineIdx, segIdx, tok.offset);
            else if (onInsertChord) onInsertChord(lineIdx, segIdx, tok.offset);
          };
          const hintChar = isMoving ? '↓' : '+';
          const hintStyle = isMoving ? styles.moveTarget : styles.insertHint;
          return (
            <Pressable
              key={i}
              hitSlop={2}
              onPress={handlePress}
              style={({ pressed }) => [styles.segment, pressed && { opacity: 0.5 }]}
            >
              <Text style={[hintStyle, { fontSize: fontSize * 0.7, height: chordHeight, lineHeight: chordHeight }]}>{hintChar}</Text>
              <Text style={{ color: colors.text, fontSize, lineHeight }}>{tok.text}</Text>
            </Pressable>
          );
        })}
      </>
    );
  }

  const onPress = editing
    ? selectingMoveSource
      ? seg.chord && onSelectMoveSource
        ? () => onSelectMoveSource(lineIdx, segIdx)
        : undefined
      : isMoving
        ? undefined
        : onDeleteChord
          ? () => onDeleteChord(lineIdx, segIdx)
          : undefined
    : onChordPress
      ? () => onChordPress(transposed)
      : undefined;
  return (
    <View style={styles.segment}>
      {seg.chord ? (
        <ChordChip
          chord={transposed}
          fontSize={fontSize * 0.85}
          height={chordHeight}
          onPress={onPress}
          editing={editing}
          moving={isMovingThis}
          selecting={selectingMoveSource}
        />
      ) : (
        <Text style={{ height: chordHeight, lineHeight: chordHeight }}> </Text>
      )}
      <Text
        style={{
          color: colors.text,
          fontSize,
          lineHeight,
        }}
      >
        {seg.text.length === 0 ? ' ' : seg.text}
      </Text>
    </View>
  );
}

interface ChipProps {
  chord: string;
  fontSize: number;
  height?: number;
  onPress?: () => void;
  standalone?: boolean;
  editing?: boolean;
  moving?: boolean;
  selecting?: boolean;
}

function ChordChip({ chord, fontSize, height, onPress, standalone, editing, moving, selecting }: ChipProps) {
  const showDeleteHint = editing && !moving && !selecting;
  const content = (
    <Text
      style={[
        styles.chord,
        { fontSize, height: height ?? fontSize * 1.4, lineHeight: height ?? fontSize * 1.4 },
        standalone && { marginRight: 12 },
        showDeleteHint && styles.chordEditing,
        moving && styles.chordMoving,
        selecting && styles.chordSelecting,
      ]}
    >
      {chord}
      {showDeleteHint ? ' ×' : ''}
    </Text>
  );
  if (!onPress) return content;
  return (
    <Pressable
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.5 }}
    >
      {content}
    </Pressable>
  );
}

export const ChordLine = memo(ChordLineBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  segment: {
    flexDirection: 'column',
  },
  chord: {
    color: colors.chord,
    fontWeight: '700',
  },
  chordEditing: {
    color: colors.danger,
    textDecorationLine: 'underline',
  },
  insertHint: {
    color: colors.textDim,
    fontWeight: '700',
    textAlign: 'left',
  },
  moveTarget: {
    color: colors.accent,
    fontWeight: '700',
    textAlign: 'left',
  },
  chordMoving: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  chordSelecting: {
    color: colors.accent,
  },
});
