import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@psalterio:song-overrides';

type Overrides = Record<number, string>;

let memoryCache: Overrides = {};
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(o: Overrides) => void>();

function persist(o: Overrides) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(o)).catch(() => {});
}

function notify() {
  const snapshot = { ...memoryCache };
  listeners.forEach((fn) => fn(snapshot));
}

export function hydrateOverrides(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      try {
        memoryCache = raw ? JSON.parse(raw) : {};
      } catch {
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

export function useSongOverride(songId: number | undefined) {
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

  const override = songId != null ? overrides[songId] : undefined;

  const setOverride = useCallback((content: string) => {
    if (songId == null) return;
    memoryCache = { ...memoryCache, [songId]: content };
    notify();
    persist(memoryCache);
  }, [songId]);

  const clearOverride = useCallback(() => {
    if (songId == null) return;
    const { [songId]: _, ...rest } = memoryCache;
    memoryCache = rest;
    notify();
    persist(memoryCache);
  }, [songId]);

  return { override, setOverride, clearOverride, hasOverride: override != null };
}
