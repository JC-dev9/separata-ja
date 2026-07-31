import {
  deleteChordAt,
  insertChordAt,
  isInstrumentalLine,
  normalizeChord,
  parseLine,
  Segment,
  serializeLine,
} from '../chord-parser';

describe('normalizeChord', () => {
  it('converte sustenidos em notação LaTeX', () => {
    expect(normalizeChord('F$^{#}')).toBe('F#');
  });

  it('converte bemóis em notação LaTeX', () => {
    expect(normalizeChord('E$^{b}')).toBe('Eb');
  });

  it('converte superscripts numéricos', () => {
    expect(normalizeChord('B$^{7}$')).toBe('B7');
  });

  it('trata acordes com baixo', () => {
    expect(normalizeChord('Cm/E$^{b}')).toBe('Cm/Eb');
  });

  it('deixa acordes já canónicos intactos', () => {
    expect(normalizeChord('Am')).toBe('Am');
    expect(normalizeChord('G#m7')).toBe('G#m7');
  });

  it('colapsa espaços e apara extremidades', () => {
    expect(normalizeChord('  C   G  ')).toBe('C G');
  });
});

describe('parseLine', () => {
  it('devolve um único segmento sem acorde quando não há colchetes', () => {
    expect(parseLine('Só letra aqui')).toEqual([{ chord: '', text: 'Só letra aqui' }]);
  });

  it('separa texto antes do primeiro acorde', () => {
    expect(parseLine('Ó [C]meu Deus')).toEqual([
      { chord: '', text: 'Ó ' },
      { chord: 'C', text: 'meu Deus' },
    ]);
  });

  it('associa cada acorde ao texto que o segue', () => {
    expect(parseLine('[C]Santo [G]Deus')).toEqual([
      { chord: 'C', text: 'Santo ' },
      { chord: 'G', text: 'Deus' },
    ]);
  });

  it('expande múltiplos acordes dentro do mesmo colchete', () => {
    // Só o último acorde do grupo carrega a letra seguinte, para a próxima
    // âncora continuar alinhada.
    expect(parseLine('[C G]Amém')).toEqual([
      { chord: 'C', text: ' ' },
      { chord: 'G', text: 'Amém' },
    ]);
  });

  it('normaliza acordes LaTeX ao fazer parse', () => {
    expect(parseLine('[F$^{#}]teste')).toEqual([{ chord: 'F#', text: 'teste' }]);
  });

  it('trata colchetes vazios como segmento sem acorde', () => {
    expect(parseLine('[]texto')).toEqual([{ chord: '', text: 'texto' }]);
  });
});

describe('serializeLine', () => {
  const roundTrip = (line: string) => serializeLine(parseLine(line));

  it('reconstrói uma linha simples', () => {
    expect(roundTrip('[C]Santo [G]Deus')).toBe('[C]Santo [G]Deus');
  });

  it('reconstrói uma linha com texto inicial sem acorde', () => {
    expect(roundTrip('Ó [C]meu Deus')).toBe('Ó [C]meu Deus');
  });

  it('reconstrói uma linha sem acordes', () => {
    expect(roundTrip('apenas letra')).toBe('apenas letra');
  });

  it('expande grupos de acordes de forma estável', () => {
    // O grupo `[C G]` passa a acordes separados — a re-serialização deve ser
    // idempotente a partir daí.
    const once = roundTrip('[C G]Amém');
    expect(once).toBe('[C] [G]Amém');
    expect(roundTrip(once)).toBe(once);
  });
});

describe('isInstrumentalLine', () => {
  it('reconhece linhas só com acordes', () => {
    expect(isInstrumentalLine('[C] [G] [Am]')).toBe(true);
  });

  it('rejeita linhas com letra', () => {
    expect(isInstrumentalLine('[C]Santo')).toBe(false);
  });

  it('rejeita linhas sem acordes', () => {
    expect(isInstrumentalLine('   ')).toBe(false);
  });
});

describe('insertChordAt', () => {
  it('divide um segmento sem acorde e dá o acorde à direita', () => {
    const segs: Segment[] = [{ chord: '', text: 'Santo Deus' }];
    expect(insertChordAt(segs, 0, 6, 'G')).toEqual([
      { chord: '', text: 'Santo ' },
      { chord: 'G', text: 'Deus' },
    ]);
  });

  it('mantém o acorde original à esquerda ao dividir um segmento com acorde', () => {
    const segs: Segment[] = [{ chord: 'C', text: 'Santo Deus' }];
    expect(insertChordAt(segs, 0, 6, 'G')).toEqual([
      { chord: 'C', text: 'Santo ' },
      { chord: 'G', text: 'Deus' },
    ]);
  });

  it('ignora inserção no offset 0 de um segmento que já tem acorde', () => {
    const segs: Segment[] = [{ chord: 'C', text: 'Santo' }];
    expect(insertChordAt(segs, 0, 0, 'G')).toBe(segs);
  });

  it('ignora acorde vazio', () => {
    const segs: Segment[] = [{ chord: '', text: 'Santo' }];
    expect(insertChordAt(segs, 0, 2, '')).toBe(segs);
  });

  it('ignora índices fora do intervalo', () => {
    const segs: Segment[] = [{ chord: '', text: 'Santo' }];
    expect(insertChordAt(segs, 5, 0, 'G')).toBe(segs);
    expect(insertChordAt(segs, -1, 0, 'G')).toBe(segs);
  });

  it('limita o offset ao comprimento do texto', () => {
    const segs: Segment[] = [{ chord: '', text: 'Ab' }];
    expect(insertChordAt(segs, 0, 99, 'G')).toEqual([
      { chord: '', text: 'Ab' },
      { chord: 'G', text: '' },
    ]);
  });

  it('não altera o array original', () => {
    const segs: Segment[] = [{ chord: '', text: 'Santo Deus' }];
    const copy = JSON.parse(JSON.stringify(segs));
    insertChordAt(segs, 0, 6, 'G');
    expect(segs).toEqual(copy);
  });
});

describe('deleteChordAt', () => {
  it('funde o texto com o segmento anterior', () => {
    const segs: Segment[] = [
      { chord: 'C', text: 'Santo ' },
      { chord: 'G', text: 'Deus' },
    ];
    expect(deleteChordAt(segs, 1)).toEqual([{ chord: 'C', text: 'Santo Deus' }]);
  });

  it('limpa o acorde quando é o primeiro segmento', () => {
    const segs: Segment[] = [{ chord: 'C', text: 'Santo' }];
    expect(deleteChordAt(segs, 0)).toEqual([{ chord: '', text: 'Santo' }]);
  });

  it('ignora segmentos sem acorde', () => {
    const segs: Segment[] = [{ chord: '', text: 'Santo' }];
    expect(deleteChordAt(segs, 0)).toBe(segs);
  });

  it('ignora índices fora do intervalo', () => {
    const segs: Segment[] = [{ chord: 'C', text: 'Santo' }];
    expect(deleteChordAt(segs, 9)).toBe(segs);
    expect(deleteChordAt(segs, -1)).toBe(segs);
  });

  it('não altera o array original', () => {
    const segs: Segment[] = [
      { chord: 'C', text: 'Santo ' },
      { chord: 'G', text: 'Deus' },
    ];
    const copy = JSON.parse(JSON.stringify(segs));
    deleteChordAt(segs, 1);
    expect(segs).toEqual(copy);
  });
});

describe('inserir e apagar são inversos', () => {
  it('apagar um acorde acabado de inserir devolve a letra original', () => {
    const original = 'Santo Deus';
    const segs = parseLine(original);
    const inserted = insertChordAt(segs, 0, 6, 'G');
    const deleted = deleteChordAt(inserted, 1);
    expect(serializeLine(deleted)).toBe(original);
  });
});
