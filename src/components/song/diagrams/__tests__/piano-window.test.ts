import { getPianoShape, PianoShape } from '@/src/data/chord-shapes';

import { windowFor } from '../PianoDiagram';

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const isWhite = (semi: number) => WHITE_PCS.includes(((semi % 12) + 12) % 12);

function shapeOf(chord: string): PianoShape {
  const s = getPianoShape(chord);
  if (!s) throw new Error(`sem forma de piano para ${chord}`);
  return s;
}

// Reproduz a colocação das teclas do diagrama: brancas a partir de `start`,
// pretas encostadas à branca anterior (a última branca não leva preta).
function keysOf(chord: string) {
  const w = windowFor(shapeOf(chord));
  const whites: number[] = [];
  for (let s = w.start; whites.length < w.whiteCount; s++) {
    if (isWhite(s)) whites.push(s);
  }
  const blacks = whites
    .slice(0, -1)
    .filter((semi) => !isWhite(semi + 1))
    .map((semi) => semi + 1);
  return { ...w, whites, blacks };
}

describe('windowFor', () => {
  it('não envolve as notas do acorde para a esquerda da tónica', () => {
    // O bug antigo: Am reduzido a classes de altura dava Dó-Mi-Lá.
    const { highlighted, root } = keysOf('Am');
    expect(Math.min(...highlighted)).toBe(root);
    expect([...highlighted].sort((a, b) => a - b)).toEqual([9, 12, 16]);
  });

  it('mantém a tónica como nota mais grave em todas as tonalidades', () => {
    for (const root of ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      for (const quality of ['', 'm', '7', 'maj7', 'm7', '9', 'add9', 'dim7', 'sus4', 'aug']) {
        const chord = root + quality;
        const { highlighted, root: rootSemi } = keysOf(chord);
        expect(Math.min(...highlighted)).toBe(rootSemi);
      }
    }
  });

  it('desenha todas as notas dentro da janela', () => {
    for (const chord of ['C', 'Am', 'B9', 'Badd9', 'F#7', 'Cdim7', 'Bbm9', 'C/G', 'B/C']) {
      const { highlighted, whites, blacks } = keysOf(chord);
      const drawn = new Set([...whites, ...blacks]);
      for (const semi of highlighted) {
        expect(drawn.has(semi)).toBe(true);
      }
    }
  });

  it('separa a nona da tónica em vez de a colar à segunda', () => {
    // add9 = [0,4,7,14]; com `% 12` o 14 caía em 2, colado à tónica.
    const { highlighted, root } = keysOf('Cadd9');
    expect(highlighted.has(root + 14)).toBe(true);
    expect(highlighted.has(root + 2)).toBe(false);
  });

  it('coloca o baixo da barra abaixo da tónica', () => {
    const { root, bass, highlighted } = keysOf('C/G');
    expect(bass).toBe(root - 5);
    expect(highlighted.has(root - 5)).toBe(true);
    expect(Math.min(...highlighted)).toBe(bass);
  });

  it('distingue acordes com barra de acordes sem barra', () => {
    expect(keysOf('C/G').highlighted).not.toEqual(keysOf('C').highlighted);
  });

  it('alarga a contagem de teclas quando o baixo não cabe na janela base', () => {
    expect(keysOf('C').whiteCount).toBe(10);
    expect(keysOf('B/C').whiteCount).toBeGreaterThan(10);
  });
});
