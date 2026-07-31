import { useCallback, useEffect, useMemo, useState } from 'react';

import { readStorage, writeStorage } from '@/src/utils/storage';

const STORAGE_KEY = '@psalterio:song-overrides';

// Cada edição guarda também uma impressão digital do conteúdo original em que
// se baseou. Se um dia actualizarmos o hinário (corrigir uma letra, acertar
// acordes), conseguimos detectar que a edição do utilizador ficou presa a uma
// versão antiga e avisá-lo, em vez de o deixar preso a texto obsoleto para
// sempre sem saber porquê.
export interface OverrideEntry {
  content: string;
  /** Hash do song.content original no momento em que a edição foi criada. */
  baseHash: string;
}

type Overrides = Record<number, OverrideEntry>;

// Formato antigo: Record<number, string>, sem baseHash. Mantemos a leitura
// compatível para não deitar fora edições de utilizadores que já actualizaram.
type StoredOverrides = Record<number, OverrideEntry | string>;

let memoryCache: Overrides = {};
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(o: Overrides) => void>();

/**
 * Hash FNV-1a de 32 bits em hexadecimal. Não é criptográfico — só precisamos
 * de detectar "este texto mudou", e é barato o suficiente para correr no render.
 */
export function hashContent(content: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function migrate(stored: StoredOverrides): Overrides {
  const out: Overrides = {};
  for (const [key, value] of Object.entries(stored)) {
    const id = Number(key);
    if (!Number.isFinite(id)) continue;
    if (typeof value === 'string') {
      // Edição do formato antigo: não sabemos em que original se baseou, por
      // isso baseHash fica vazio e nunca a marcamos como desactualizada.
      out[id] = { content: value, baseHash: '' };
    } else if (value && typeof value.content === 'string') {
      out[id] = { content: value.content, baseHash: value.baseHash ?? '' };
    }
  }
  return out;
}

function persist(o: Overrides) {
  writeStorage(STORAGE_KEY, JSON.stringify(o));
}

function notify() {
  const snapshot = { ...memoryCache };
  listeners.forEach((fn) => fn(snapshot));
}

export function hydrateOverrides(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = readStorage(STORAGE_KEY)
    .then((raw) => {
      try {
        memoryCache = raw ? migrate(JSON.parse(raw) as StoredOverrides) : {};
      } catch (err) {
        if (__DEV__) console.warn('[overrides] dados corrompidos, a reiniciar:', err);
        memoryCache = {};
      }
      hydrated = true;
      notify();
    })
    .catch(() => {
      hydrated = true;
    });
  return hydrating;
}

hydrateOverrides();

export function useSongOverride(songId: number | undefined, originalContent?: string) {
  const [overrides, setOverrides] = useState<Overrides>(memoryCache);

  useEffect(() => {
    if (!hydrated) {
      hydrateOverrides().then(() => setOverrides({ ...memoryCache }));
    }
    const listener = (o: Overrides) => setOverrides(o);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const entry = songId != null ? overrides[songId] : undefined;
  const originalHash = useMemo(
    () => (originalContent != null ? hashContent(originalContent) : ''),
    [originalContent],
  );

  // Desactualizada = temos uma edição que sabe em que original se baseou, e
  // esse original já não é o que está no hinário.
  const isStale =
    entry != null && entry.baseHash !== '' && originalHash !== '' && entry.baseHash !== originalHash;

  const setOverride = useCallback(
    (content: string) => {
      if (songId == null) return;
      memoryCache = { ...memoryCache, [songId]: { content, baseHash: originalHash } };
      notify();
      persist(memoryCache);
    },
    [songId, originalHash],
  );

  const clearOverride = useCallback(() => {
    if (songId == null) return;
    const { [songId]: _, ...rest } = memoryCache;
    memoryCache = rest;
    notify();
    persist(memoryCache);
  }, [songId]);

  return {
    override: entry?.content,
    setOverride,
    clearOverride,
    hasOverride: entry != null,
    isStale,
  };
}
