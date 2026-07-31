import { useCallback, useEffect, useState } from 'react';

import { readStorage, writeStorage } from '@/src/utils/storage';

const STORAGE_KEY = '@psalterio:chordDictionaryCollapsed';

let cached = false;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(v: boolean) => void>();

function persist(value: boolean) {
  writeStorage(STORAGE_KEY, value ? '1' : '0');
}

function notify() {
  listeners.forEach((fn) => fn(cached));
}

function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = readStorage(STORAGE_KEY)
    .then((raw) => {
      if (raw !== null) cached = raw === '1';
      hydrated = true;
      notify();
    })
    .catch(() => {
      hydrated = true;
    });
  return hydrating;
}

hydrate();

export function useChordDictionaryCollapsed() {
  const [collapsed, setCollapsed] = useState(cached);

  useEffect(() => {
    if (!hydrated) {
      hydrate().then(() => setCollapsed(cached));
    }
    const listener = (v: boolean) => setCollapsed(v);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = useCallback(() => {
    cached = !cached;
    notify();
    persist(cached);
  }, []);

  return { collapsed, toggle };
}
