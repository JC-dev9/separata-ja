import { useCallback, useEffect, useState } from 'react';

import { readStorage, writeStorage } from '@/src/utils/storage';

const STORAGE_KEY = '@psalterio:favorites';

let memoryCache: Set<number> = new Set();
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(ids: Set<number>) => void>();

function persist(ids: Set<number>) {
  writeStorage(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

function notify() {
  const snapshot = new Set(memoryCache);
  listeners.forEach((fn) => fn(snapshot));
}

export function hydrateFavorites(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = readStorage(STORAGE_KEY)
    .then((raw) => {
      try {
        const ids: number[] = raw ? JSON.parse(raw) : [];
        memoryCache = new Set(ids);
      } catch (err) {
        if (__DEV__) console.warn('[favorites] dados corrompidos, a reiniciar:', err);
        memoryCache = new Set();
      }
      hydrated = true;
      notify();
    })
    .catch(() => {
      hydrated = true;
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
