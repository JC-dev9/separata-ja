import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PianoShape } from '@/src/data/chord-shapes';
import { colors } from '@/src/theme/colors';

interface Props {
  chord: string;
  shape: PianoShape | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { whiteW: 13, height: 60, label: 12, octaves: 1, pad: 6 },
  md: { whiteW: 17, height: 90, label: 16, octaves: 2, pad: 10 },
  lg: { whiteW: 26, height: 130, label: 22, octaves: 2, pad: 14 },
};

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_OFFSETS: { pc: number; after: number }[] = [
  { pc: 1, after: 0 },
  { pc: 3, after: 1 },
  { pc: 6, after: 3 },
  { pc: 8, after: 4 },
  { pc: 10, after: 5 },
];

export function PianoDiagram({ chord, shape, size = 'md' }: Props) {
  const c = SIZES[size];
  const whiteCount = 7 * c.octaves;
  const keyboardW = whiteCount * c.whiteW;
  const keyboardH = c.height;
  const blackW = c.whiteW * 0.6;
  const blackH = keyboardH * 0.62;

  const highlighted = new Set<number>();
  if (shape) {
    shape.intervals.forEach((iv) =>
      highlighted.add(((shape.rootPc + iv) % 12 + 12) % 12),
    );
  }

  const whiteKeys: { pc: number; oct: number; x: number }[] = [];
  for (let oct = 0; oct < c.octaves; oct++) {
    WHITE_PCS.forEach((pc, i) => {
      whiteKeys.push({ pc, oct, x: (oct * 7 + i) * c.whiteW });
    });
  }

  return (
    <View style={[styles.card, { width: keyboardW + c.pad * 2 }]}>
      <Text style={[styles.title, { fontSize: c.label }]} numberOfLines={1}>
        {chord || ' '}
      </Text>

      {!shape ? (
        <View
          style={[
            styles.fallback,
            { width: keyboardW + c.pad, height: keyboardH + c.pad },
          ]}
        >
          <Text style={styles.fallbackText}>—</Text>
        </View>
      ) : (
        <View style={styles.kbWrap}>
          <Svg width={keyboardW} height={keyboardH}>
            <Defs>
              <LinearGradient id="white" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.85" stopColor="#F2F2F4" />
                <Stop offset="1" stopColor="#D8D8DC" />
              </LinearGradient>
              <LinearGradient id="whiteActive" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#4FD8E4" />
                <Stop offset="1" stopColor={colors.primary} />
              </LinearGradient>
              <LinearGradient id="whiteRoot" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} />
                <Stop offset="1" stopColor={colors.primaryDim} />
              </LinearGradient>
              <LinearGradient id="black" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#3A3A40" />
                <Stop offset="0.1" stopColor="#1A1A1F" />
                <Stop offset="1" stopColor="#08080A" />
              </LinearGradient>
              <LinearGradient id="blackActive" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#2FC8D6" />
                <Stop offset="1" stopColor={colors.primaryDim} />
              </LinearGradient>
              <LinearGradient id="blackRoot" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#4FD8E4" />
                <Stop offset="1" stopColor={colors.primary} />
              </LinearGradient>
            </Defs>

            {/* White keys */}
            {whiteKeys.map((wk, i) => {
              const isRoot = wk.oct === 0 && wk.pc === shape.rootPc;
              const active = wk.oct === 0 && highlighted.has(wk.pc);
              const fill = isRoot ? 'url(#whiteRoot)' : active ? 'url(#whiteActive)' : 'url(#white)';
              return (
                <Rect
                  key={`w${i}`}
                  x={wk.x + 0.5}
                  y={0}
                  width={c.whiteW - 1}
                  height={keyboardH}
                  fill={fill}
                  stroke="#1A1A1F"
                  strokeWidth={0.6}
                  rx={2}
                />
              );
            })}

            {/* Black keys (rendered after whites so they overlay) */}
            {Array.from({ length: c.octaves }).flatMap((_, oct) =>
              BLACK_OFFSETS.map((b) => {
                const isRoot = oct === 0 && b.pc === shape.rootPc;
                const active = oct === 0 && highlighted.has(b.pc);
                const xCenter = (oct * 7 + b.after + 1) * c.whiteW;
                const fill = isRoot ? 'url(#blackRoot)' : active ? 'url(#blackActive)' : 'url(#black)';
                return (
                  <Rect
                    key={`b${oct}-${b.pc}`}
                    x={xCenter - blackW / 2}
                    y={0}
                    width={blackW}
                    height={blackH}
                    fill={fill}
                    rx={2}
                  />
                );
              }),
            )}
          </Svg>
        </View>
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
  kbWrap: {
    backgroundColor: '#0A0A0D',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: '#222',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
  },
  fallbackText: { color: colors.textMuted, fontSize: 18 },
});
