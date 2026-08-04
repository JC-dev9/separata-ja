/**
 * Instrumento dos diagramas de acordes. Vive aqui, e não no componente que o
 * desenha, para o hook da preferência não ter de importar de `src/components/`.
 */
export type Instrument = 'guitar' | 'piano';

export interface Song {
  id: number;
  number: number;
  title: string;
  content: string;
  credits?: string;
}

export interface RawSong {
  id: string | number;
  number: string | number;
  title: string;
  content: string;
  credits?: string;
}

export function parseSong(raw: RawSong): Song {
  return {
    id: typeof raw.id === 'number' ? raw.id : parseInt(raw.id, 10),
    number: typeof raw.number === 'number' ? raw.number : parseInt(raw.number, 10),
    title: raw.title,
    content: raw.content,
    credits: raw.credits,
  };
}
