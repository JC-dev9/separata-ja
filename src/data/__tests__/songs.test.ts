import { loadSongs } from '../songs';

describe('catálogo de músicas', () => {
  it('é apresentado por ordem alfabética portuguesa', () => {
    const songs = loadSongs();
    const sortedTitles = [...songs]
      .sort((a, b) => a.title.localeCompare(b.title, 'pt', { sensitivity: 'base' }))
      .map((song) => song.title);

    expect(songs.map((song) => song.title)).toEqual(sortedTitles);
  });

  it('mantém o número nos dados sem o incluir no índice de pesquisa', () => {
    const song = loadSongs().find(
      (candidate) =>
        !`${candidate.title} ${candidate.credits ?? ''}`.includes(String(candidate.number)),
    );

    expect(song).toBeDefined();
    expect(song?.number).toEqual(expect.any(Number));
    expect(song?.searchIndex).not.toContain(String(song?.number));
  });
});
