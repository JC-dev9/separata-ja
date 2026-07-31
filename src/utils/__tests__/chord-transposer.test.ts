import {
  detectOriginalKey,
  extractUniqueChords,
  KEYS,
  noteIndex,
  normalizeRoot,
  preferFlats,
  semitonesBetween,
  transposeChord,
} from '../chord-transposer';

describe('noteIndex', () => {
  it('mapeia notas naturais', () => {
    expect(noteIndex('C')).toBe(0);
    expect(noteIndex('E')).toBe(4);
    expect(noteIndex('B')).toBe(11);
  });

  it('mapeia sustenidos', () => {
    expect(noteIndex('C#')).toBe(1);
    expect(noteIndex('G#')).toBe(8);
  });

  it('trata bemóis como enarmónicos dos sustenidos', () => {
    expect(noteIndex('Db')).toBe(noteIndex('C#'));
    expect(noteIndex('Bb')).toBe(noteIndex('A#'));
  });

  it('devolve -1 para notas inválidas', () => {
    expect(noteIndex('H')).toBe(-1);
  });
});

describe('preferFlats', () => {
  it('prefere bemóis em tonalidades com bemol no nome', () => {
    expect(preferFlats('Bb')).toBe(true);
    expect(preferFlats('Eb')).toBe(true);
  });

  it('prefere bemóis em F', () => {
    expect(preferFlats('F')).toBe(true);
  });

  it('prefere sustenidos nas restantes', () => {
    expect(preferFlats('C')).toBe(false);
    expect(preferFlats('D')).toBe(false);
    expect(preferFlats('F#')).toBe(false);
  });

  it('trata string vazia sem rebentar', () => {
    expect(preferFlats('')).toBe(false);
  });
});

describe('transposeChord', () => {
  it('devolve o acorde intacto sem transposição nem tonalidade alvo', () => {
    expect(transposeChord('Am', 0)).toBe('Am');
  });

  it('sobe acordes maiores', () => {
    expect(transposeChord('C', 2, 'D')).toBe('D');
    expect(transposeChord('G', 2, 'A')).toBe('A');
  });

  it('desce acordes', () => {
    expect(transposeChord('D', -2, 'C')).toBe('C');
  });

  it('preserva o sufixo do acorde', () => {
    expect(transposeChord('Am7', 2, 'B')).toBe('Bm7');
    expect(transposeChord('Cmaj7', 5, 'F')).toBe('Fmaj7');
  });

  it('transpõe também o baixo em acordes invertidos', () => {
    expect(transposeChord('C/E', 2, 'D')).toBe('D/F#');
  });

  it('usa bemóis quando a tonalidade alvo os prefere', () => {
    expect(transposeChord('C', 1, 'Db')).toBe('Db');
    expect(transposeChord('C', 3, 'Eb')).toBe('Eb');
  });

  it('usa sustenidos quando a tonalidade alvo os prefere', () => {
    expect(transposeChord('C', 1, 'C#')).toBe('C#');
  });

  it('dá a volta ao fim da escala', () => {
    expect(transposeChord('B', 1, 'C')).toBe('C');
    expect(transposeChord('C', -1, 'B')).toBe('B');
  });

  it('devolve o input quando não é um acorde reconhecível', () => {
    expect(transposeChord('N.C.', 2, 'D')).toBe('N.C.');
    expect(transposeChord('', 2, 'D')).toBe('');
  });

  it('transpor e voltar atrás devolve a nota original', () => {
    const up = transposeChord('C', 5, 'F');
    expect(transposeChord(up, -5, 'C')).toBe('C');
  });
});

describe('extractUniqueChords', () => {
  it('recolhe acordes distintos preservando a ordem de aparição', () => {
    expect(extractUniqueChords('[C]Santo [G]Deus [C]outra vez')).toEqual(['C', 'G']);
  });

  it('expande grupos dentro do mesmo colchete', () => {
    expect(extractUniqueChords('[C G Am]')).toEqual(['C', 'G', 'Am']);
  });

  it('normaliza acordes LaTeX', () => {
    expect(extractUniqueChords('[F$^{#}]x')).toEqual(['F#']);
  });

  it('devolve lista vazia sem acordes', () => {
    expect(extractUniqueChords('apenas letra')).toEqual([]);
  });
});

describe('detectOriginalKey', () => {
  it('usa a raiz do primeiro acorde', () => {
    expect(detectOriginalKey('[G]Santo [C]Deus')).toBe('G');
  });

  it('descarta o sufixo do acorde', () => {
    expect(detectOriginalKey('[Am7]Santo')).toBe('A');
  });

  it('preserva acidentes', () => {
    expect(detectOriginalKey('[F#m]Santo')).toBe('F#');
    expect(detectOriginalKey('[Bb]Santo')).toBe('Bb');
  });

  it('cai em C quando não há acordes', () => {
    expect(detectOriginalKey('apenas letra')).toBe('C');
  });
});

describe('semitonesBetween', () => {
  it('devolve 0 para a mesma tonalidade', () => {
    expect(semitonesBetween('C', 'C')).toBe(0);
  });

  it('calcula subidas', () => {
    expect(semitonesBetween('C', 'D')).toBe(2);
  });

  it('calcula descidas', () => {
    expect(semitonesBetween('D', 'C')).toBe(-2);
  });

  it('escolhe sempre o caminho mais curto', () => {
    // C→A são 9 semitons a subir, mas apenas 3 a descer.
    expect(semitonesBetween('C', 'A')).toBe(-3);
    expect(semitonesBetween('A', 'C')).toBe(3);
  });

  it('trata enarmónicos como equivalentes', () => {
    expect(semitonesBetween('C#', 'Db')).toBe(0);
  });

  it('devolve 0 para tonalidades inválidas', () => {
    expect(semitonesBetween('H', 'C')).toBe(0);
  });
});

describe('normalizeRoot', () => {
  it('converte sustenidos em bemóis quando pedido', () => {
    expect(normalizeRoot('C#', true)).toBe('Db');
  });

  it('converte bemóis em sustenidos quando pedido', () => {
    expect(normalizeRoot('Db', false)).toBe('C#');
  });

  it('deixa notas naturais intactas', () => {
    expect(normalizeRoot('C', true)).toBe('C');
    expect(normalizeRoot('C', false)).toBe('C');
  });
});

describe('KEYS', () => {
  it('só contém tonalidades reconhecíveis', () => {
    KEYS.forEach((k) => expect(noteIndex(k)).toBeGreaterThanOrEqual(0));
  });

  it('cobre as doze classes de altura', () => {
    expect(new Set(KEYS.map(noteIndex)).size).toBe(12);
  });
});
