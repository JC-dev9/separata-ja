import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { PianoShape, PIANO_KEY_NAMES } from '@/src/data/chord-shapes';
import { colors } from '@/src/theme/colors';

interface Props {
  chord: string;
  shape: PianoShape | null;
  size?: 'sm' | 'md' | 'lg';
}

// Largura total do teclado = whiteW * BASE_WHITES, fixa por tamanho. Acordes que
// precisem de mais teclas (baixos invertidos) alargam a contagem e estreitam a
// tecla, para o cartão nunca mudar de largura no meio de uma lista.
const BASE_WHITES = 10;

const SIZES = {
  sm: { whiteW: 11, height: 56, label: 12, pad: 6, notes: false },
  md: { whiteW: 18, height: 88, label: 16, pad: 10, notes: true },
  lg: { whiteW: 30, height: 128, label: 22, pad: 14, notes: true },
};

const NOTE_STRIP = 16;
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

const isWhite = (semi: number) => WHITE_PCS.includes(((semi % 12) + 12) % 12);
const noteName = (semi: number) => PIANO_KEY_NAMES[((semi % 12) + 12) % 12];

// Janela de teclado que cobre o acorde: começa na tecla branca imediatamente
// abaixo da nota mais grave e sobe o suficiente para a nota mais aguda caber.
export function windowFor(shape: PianoShape) {
  const root = shape.rootPc;
  const notes = shape.intervals.map((iv) => root + iv);

  let bass: number | null = null;
  if (shape.bassPc != null) {
    bass = shape.bassPc;
    while (bass >= root) bass -= 12; // o baixo da barra soa abaixo da tónica
  }

  const lowest = bass ?? root;
  let start = lowest;
  while (!isWhite(start)) start--;

  // Uma tecla preta desenha-se entre duas brancas, por isso se a nota mais
  // aguda for preta ainda precisamos da branca acima dela.
  let end = Math.max(...notes);
  if (!isWhite(end)) end++;

  let needed = 0;
  for (let s = start; s <= end; s++) if (isWhite(s)) needed++;

  const highlighted = new Set<number>(notes);
  if (bass != null) highlighted.add(bass);

  return { start, whiteCount: Math.max(BASE_WHITES, needed), highlighted, root, bass };
}

export function PianoDiagram({ chord, shape, size = 'md' }: Props) {
  const c = SIZES[size];
  const totalW = BASE_WHITES * c.whiteW;
  const keyboardH = c.height;
  const showNotes = c.notes;
  const svgH = keyboardH + (showNotes ? NOTE_STRIP : 0);

  if (!shape) {
    return (
      <View style={[styles.card, { width: totalW + c.pad * 2 }]}>
        <Text style={[styles.title, { fontSize: c.label }]} numberOfLines={1}>
          {chord || ' '}
        </Text>
        <View style={[styles.fallback, { width: totalW, height: keyboardH }]}>
          <Text style={styles.fallbackText}>—</Text>
        </View>
      </View>
    );
  }

  const { start, whiteCount, highlighted, root, bass } = windowFor(shape);
  const whiteW = totalW / whiteCount;
  const blackW = whiteW * 0.62;
  const blackH = keyboardH * 0.62;

  // Teclas brancas da janela, da esquerda para a direita.
  const whites: { semi: number; x: number }[] = [];
  for (let s = start; whites.length < whiteCount; s++) {
    if (isWhite(s)) whites.push({ semi: s, x: whites.length * whiteW });
  }

  // Cada preta encosta ao limite direito da branca que a antecede. A última
  // branca não conta: não há tecla seguinte onde encostar.
  const blacks: { semi: number; cx: number }[] = [];
  whites.forEach((w, i) => {
    if (i < whites.length - 1 && !isWhite(w.semi + 1)) {
      blacks.push({ semi: w.semi + 1, cx: (i + 1) * whiteW });
    }
  });

  const labels = [...highlighted].sort((a, b) => a - b).map((semi) => {
    const white = whites.find((w) => w.semi === semi);
    const cx = white ? white.x + whiteW / 2 : blacks.find((b) => b.semi === semi)?.cx;
    return cx == null ? null : { semi, cx };
  });

  return (
    <View style={[styles.card, { width: totalW + c.pad * 2 }]}>
      <Text style={[styles.title, { fontSize: c.label }]} numberOfLines={1}>
        {chord || ' '}
      </Text>

      <View style={styles.kbWrap}>
        <Svg width={totalW} height={svgH}>
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

          {whites.map((w) => {
            const fill =
              w.semi === root
                ? 'url(#whiteRoot)'
                : highlighted.has(w.semi)
                  ? 'url(#whiteActive)'
                  : 'url(#white)';
            return (
              <Rect
                key={`w${w.semi}`}
                x={w.x + 0.5}
                y={0}
                width={whiteW - 1}
                height={keyboardH}
                fill={fill}
                stroke="#1A1A1F"
                strokeWidth={0.6}
                rx={2}
              />
            );
          })}

          {/* Pretas depois das brancas para ficarem por cima */}
          {blacks.map((b) => {
            const fill =
              b.semi === root
                ? 'url(#blackRoot)'
                : highlighted.has(b.semi)
                  ? 'url(#blackActive)'
                  : 'url(#black)';
            return (
              <Rect
                key={`b${b.semi}`}
                x={b.cx - blackW / 2}
                y={0}
                width={blackW}
                height={blackH}
                fill={fill}
                rx={2}
              />
            );
          })}

          {showNotes &&
            labels.map((l) =>
              l == null ? null : (
                <SvgText
                  key={`l${l.semi}`}
                  x={l.cx}
                  y={keyboardH + NOTE_STRIP - 4}
                  fontSize={Math.min(11, whiteW * 0.62)}
                  fontWeight={l.semi === root ? '800' : '600'}
                  fill={l.semi === root ? colors.primary : colors.textMuted}
                  textAnchor="middle"
                >
                  {noteName(l.semi)}
                  {l.semi === bass ? '↓' : ''}
                </SvgText>
              ),
            )}
        </Svg>
      </View>
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
