import { youtubeSearchUrl } from '../youtube';

describe('youtubeSearchUrl', () => {
  it('aponta para a pesquisa do YouTube', () => {
    expect(youtubeSearchUrl('Santo')).toBe('https://www.youtube.com/results?search_query=Santo');
  });

  it('escapa espaços', () => {
    expect(youtubeSearchUrl('Santo Santo Santo')).toContain('search_query=Santo%20Santo%20Santo');
  });

  it('escapa acentos, que quase todos os títulos do hinário têm', () => {
    expect(youtubeSearchUrl('Louvai ao Senhor com Alegria — Ó Pátria')).toBe(
      'https://www.youtube.com/results?search_query=Louvai%20ao%20Senhor%20com%20Alegria%20%E2%80%94%20%C3%93%20P%C3%A1tria',
    );
  });

  it('escapa caracteres que partiriam a query string', () => {
    // Um `&` ou um `#` por escapar transformava o resto do título noutro
    // parâmetro e a pesquisa saía truncada.
    const url = youtubeSearchUrl('Paz & Bem #1');
    expect(url).toContain('%26');
    expect(url).toContain('%231');
    expect(url.split('?')[1]).not.toContain('&');
  });

  it('aguenta um título vazio sem produzir um URL inválido', () => {
    expect(youtubeSearchUrl('')).toBe('https://www.youtube.com/results?search_query=');
  });
});
