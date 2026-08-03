import { useCallback, useEffect, useMemo, useState } from 'react';

import { createStorageSlot } from '@/src/utils/storage';

const STORAGE_KEY = '@separata:song-overrides';

const slot = createStorageSlot(STORAGE_KEY);

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

interface Snapshot {
  overrides: Overrides;
  /** A última gravação não chegou ao disco. */
  saveFailed: boolean;
}

let memoryCache: Overrides = {};
let saveFailed = false;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(s: Snapshot) => void>();

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

function notify() {
  const snapshot: Snapshot = { overrides: { ...memoryCache }, saveFailed };
  listeners.forEach((fn) => fn(snapshot));
}

/**
 * Grava e regista se resultou.
 *
 * Nos favoritos ou no tamanho da letra uma gravação falhada não vale um aviso —
 * refaz-se com um toque. Aqui o utilizador escreveu o conteúdo à mão, por isso
 * a app diz-lhe que a edição não ficou guardada em vez de o deixar descobrir
 * quando reabrir a música.
 */
function persist(o: Overrides): Promise<void> {
  return slot.write(JSON.stringify(o)).then((ok) => {
    const failed = !ok;
    if (failed === saveFailed) return;
    saveFailed = failed;
    notify();
  });
}

export function setOverrideFor(songId: number, content: string, baseHash: string): Promise<void> {
  memoryCache = { ...memoryCache, [songId]: { content, baseHash } };
  notify();
  return persist(memoryCache);
}

export function clearOverrideFor(songId: number): Promise<void> {
  const { [songId]: _removed, ...rest } = memoryCache;
  memoryCache = rest;
  notify();
  return persist(memoryCache);
}

/** `true` quando a última gravação de edições não chegou ao disco. */
export function hasSaveFailed(): boolean {
  return saveFailed;
}

export function hydrateOverrides(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = slot.read().then((result) => {
    // Falha de leitura: seguimos sem edições em memória, mas o slot suspendeu
    // as escritas. Aqui isso é crítico — gravar levaria à frente as edições de
    // todas as músicas de uma vez, porque vivem todas nesta chave.
    if (result.ok) {
      try {
        memoryCache = result.value ? migrate(JSON.parse(result.value) as StoredOverrides) : {};
      } catch (err) {
        if (__DEV__) console.warn('[overrides] dados corrompidos, a reiniciar:', err);
        memoryCache = {};
      }
    }
    hydrated = true;
    notify();
  });
  return hydrating;
}

hydrateOverrides();

export function useSongOverride(songId: number | undefined, originalContent?: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    overrides: memoryCache,
    saveFailed,
  }));

  useEffect(() => {
    if (!hydrated) {
      hydrateOverrides().then(() => setSnapshot({ overrides: { ...memoryCache }, saveFailed }));
    }
    const listener = (s: Snapshot) => setSnapshot(s);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const { overrides } = snapshot;
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
      setOverrideFor(songId, content, originalHash);
    },
    [songId, originalHash],
  );

  const clearOverride = useCallback(() => {
    if (songId == null) return;
    clearOverrideFor(songId);
  }, [songId]);

  return {
    override: entry?.content,
    setOverride,
    clearOverride,
    hasOverride: entry != null,
    isStale,
    saveFailed: snapshot.saveFailed,
  };
}
