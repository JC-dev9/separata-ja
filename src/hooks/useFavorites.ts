import { useCallback, useEffect, useState } from 'react';

import { createStorageSlot } from '@/src/utils/storage';

const STORAGE_KEY = '@separata:favorites';

const slot = createStorageSlot(STORAGE_KEY);

let memoryCache: Set<number> = new Set();
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(ids: Set<number>) => void>();

function persist(ids: Set<number>) {
  slot.write(JSON.stringify(Array.from(ids)));
}

function notify() {
  const snapshot = new Set(memoryCache);
  listeners.forEach((fn) => fn(snapshot));
}

export function hydrateFavorites(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = slot.read().then((result) => {
    // Falha de leitura: ficamos com o cache vazio, mas o slot já suspendeu as
    // escritas, por isso os favoritos no disco não correm risco de ser apagados.
    if (result.ok) {
      try {
        const ids: number[] = result.value ? JSON.parse(result.value) : [];
        memoryCache = new Set(ids);
      } catch (err) {
        // Corrompido é diferente de ilegível: aqui vimos o conteúdo e ele não
        // presta, por isso reiniciar e voltar a gravar por cima é seguro.
        if (__DEV__) console.warn('[favorites] dados corrompidos, a reiniciar:', err);
        memoryCache = new Set();
      }
    }
    hydrated = true;
    notify();
  });
  return hydrating;
}

// Kick off persistence load immediately so the home screen can render
// favorite hearts on the first frame after boot.
hydrateFavorites();

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(memoryCache);

  useEffect(() => {
    if (!hydrated) {
      hydrateFavorites().then(() => setFavorites(new Set(memoryCache)));
    }
    const listener = (ids: Set<number>) => setFavorites(ids);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = useCallback((id: number) => {
    if (memoryCache.has(id)) memoryCache.delete(id);
    else memoryCache.add(id);
    notify();
    persist(memoryCache);
  }, []);

  const isFavorite = useCallback((id: number) => favorites.has(id), [favorites]);

  return { favorites, isFavorite, toggle, loading: !hydrated && favorites.size === 0 };
}
