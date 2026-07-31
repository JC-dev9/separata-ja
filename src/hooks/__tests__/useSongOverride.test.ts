import { hashContent } from '../useSongOverride';

describe('hashContent', () => {
  it('é determinístico', () => {
    expect(hashContent('[C]Santo Deus')).toBe(hashContent('[C]Santo Deus'));
  });

  it('muda quando o conteúdo muda', () => {
    expect(hashContent('[C]Santo Deus')).not.toBe(hashContent('[G]Santo Deus'));
  });

  it('deteta alterações mínimas', () => {
    // Uma vírgula a mais tem de dar hash diferente, senão uma correcção
    // pequena no hinário passaria despercebida.
    expect(hashContent('Santo Deus')).not.toBe(hashContent('Santo, Deus'));
  });

  it('distingue conteúdo vazio de espaço', () => {
    expect(hashContent('')).not.toBe(hashContent(' '));
  });

  it('devolve sempre uma string hexadecimal', () => {
    ['', 'a', '[C]Santo\n[G]Deus', 'ç'.repeat(500)].forEach((s) => {
      expect(hashContent(s)).toMatch(/^[0-9a-f]+$/);
    });
  });
});
