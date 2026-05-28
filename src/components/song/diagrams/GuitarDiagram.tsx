import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { GuitarShape } from '@/src/data/chord-shapes';
import { colors } from '@/src/theme/colors';

interface Props {
  chord: string;
  shape: GuitarShape | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { stringGap: 11, fretGap: 13, dot: 5,  label: 12, padTop: 14, padX: 10, padBottom: 6 },
  md: { stringGap: 18, fretGap: 22, dot: 8,  label: 16, padTop: 20, padX: 14, padBottom: 8 },
  lg: { stringGap: 28, fretGap: 32, dot: 11, label: 22, padTop: 26, padX: 18, padBottom: 10 },
};

const STRINGS = 6;
const FRETS = 5;

export function GuitarDiagram({ chord, shape, size = 'md' }: Props) {
  const c = SIZES[size];
  const gridW = (STRINGS - 1) * c.stringGap;
  const gridH = FRETS * c.fretGap;
  const svgW = gridW + c.padX * 2;
  const svgH = gridH + c.padTop + c.padBottom;
  const baseFret = shape?.baseFret ?? 1;

  return (
    <View style={[styles.card, { width: svgW + 12 }]}>
      <Text style={[styles.title, { fontSize: c.label }]} numberOfLines={1}>
        {chord || ' '}
      </Text>

      {!shape ? (
        <View style={[styles.fallback, { width: svgW, height: svgH }]}>
          <Text style={styles.fallbackText}>—</Text>
        </View>
      ) : (
        <Svg width={svgW} height={svgH}>
          <Defs>
            <LinearGradient id="board" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3A2618" />
              <Stop offset="1" stopColor="#1F140B" />
            </LinearGradient>
            <LinearGradient id="string" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#C8C8CE" />
              <Stop offset="0.5" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#9A9A9F" />
            </LinearGradient>
            <LinearGradient id="dot" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4FD8E4" />
              <Stop offset="1" stopColor={colors.primary} />
            </LinearGradient>
          </Defs>

          {/* Fretboard */}
          <Rect
            x={c.padX}
            y={c.padTop}
            width={gridW}
            height={gridH}
            fill="url(#board)"
            rx={3}
          />

          {/* Frets */}
          {Array.from({ length: FRETS + 1 }).map((_, i) => {
            const isNut = i === 0 && baseFret === 1;
            return (
              <Rect
                key={`f${i}`}
                x={c.padX - (isNut ? 1 : 0)}
                y={c.padTop + i * c.fretGap - (isNut ? 1.5 : 0.6)}
                width={gridW + (isNut ? 2 : 0)}
                height={isNut ? 4 : 1.4}
                fill={isNut ? colors.text : '#5C4329'}
                rx={isNut ? 1.5 : 0.7}
              />
            );
          })}

          {/* Strings (thinnest at high E, thickest at low E) */}
          {Array.from({ length: STRINGS }).map((_, i) => {
            const sw = 0.9 + (STRINGS - 1 - i) * 0.18;
            return (
              <Rect
                key={`s${i}`}
                x={c.padX + i * c.stringGap - sw / 2}
                y={c.padTop}
                width={sw}
                height={gridH}
                fill="url(#string)"
                opacity={0.85}
              />
            );
          })}

          {/* Fret position label (only when shifted up) */}
          {baseFret > 1 ? (
            <SvgText
              x={c.padX - 4}
              y={c.padTop + c.fretGap * 0.7}
              fill={colors.textMuted}
              fontSize={c.label - 4}
              fontWeight="600"
              textAnchor="end"
            >
              {baseFret}
            </SvgText>
          ) : null}

          {/* Open / muted markers above the nut */}
          {shape.frets.map((fret, i) => {
            const x = c.padX + i * c.stringGap;
            const y = c.padTop - 6;
            if (fret === 0 && baseFret === 1) {
              return (
                <Circle
                  key={`o${i}`}
                  cx={x}
                  cy={y}
                  r={c.dot * 0.5}
                  fill="none"
                  stroke={colors.textMuted}
                  strokeWidth={1.2}
                />
              );
            }
            if (fret === -1) {
              return (
                <SvgText
                  key={`x${i}`}
                  x={x}
                  y={y + c.dot * 0.4}
                  fill={colors.textMuted}
                  fontSize={c.label - 2}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  ×
                </SvgText>
              );
            }
            return null;
          })}

          {/* Barre */}
          {shape.barre ? (
            <Rect
              x={c.padX + shape.barre.from * c.stringGap - c.dot}
              y={c.padTop + (shape.barre.fret - baseFret + 0.5) * c.fretGap - c.dot}
              width={(shape.barre.to - shape.barre.from) * c.stringGap + c.dot * 2}
              height={c.dot * 2}
              rx={c.dot}
              fill="url(#dot)"
              stroke="#0A6E78"
              strokeWidth={0.8}
            />
          ) : null}

          {/* Finger dots */}
          {shape.frets.map((fret, i) => {
            if (fret <= 0) return null;
            const inBarre =
              shape.barre &&
              shape.barre.fret === fret &&
              i >= shape.barre.from &&
              i <= shape.barre.to;
            if (inBarre) return null;
            const cx = c.padX + i * c.stringGap;
            const cy = c.padTop + (fret - baseFret + 0.5) * c.fretGap;
            return (
              <Circle
                key={`d${i}`}
                cx={cx}
                cy={cy}
                r={c.dot}
                fill="url(#dot)"
                stroke="#0A6E78"
                strokeWidth={0.8}
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  title: {
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
  },
  fallbackText: { color: colors.textMuted, fontSize: 18 },
});
