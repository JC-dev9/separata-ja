import { useCallback, useEffect, useState } from 'react';

import { readStorage, writeStorage } from '@/src/utils/storage';

const STORAGE_KEY = '@psalterio:fontSize';
const DEFAULT_FONT_SIZE = 19;
const MIN_FONT = 12;
const MAX_FONT = 28;

let cached: number = DEFAULT_FONT_SIZE;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(size: number) => void>();

function persist(size: number) {
  writeStorage(STORAGE_KEY, String(size));
}

function notify() {
  listeners.forEach((fn) => fn(cached));
}

function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = readStorage(STORAGE_KEY)
    .then((raw) => {
      const parsed = raw !== null ? parseInt(raw, 10) : NaN;
      cached = !isNaN(parsed) ? Math.min(MAX_FONT, Math.max(MIN_FONT, parsed)) : DEFAULT_FONT_SIZE;
      hydrated = true;
      notify();
    })
    .catch(() => {
      hydrated = true;
    });
  return hydrating;
}

hydrate();

export function useFontSize() {
  const [fontSize, setFontSize] = useState(cached);

  useEffect(() => {
    if (!hydrated) {
      hydrate().then(() => setFontSize(cached));
    }
    const listener = (size: number) => setFontSize(size);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const changeFont = useCallback((delta: number) => {
    cached = Math.min(MAX_FONT, Math.max(MIN_FONT, cached + delta));
    notify();
    persist(cached);
  }, []);

  return { fontSize, changeFont };
}
