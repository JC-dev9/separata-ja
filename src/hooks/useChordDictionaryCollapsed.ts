import { useCallback, useEffect, useState } from 'react';

import { createStorageSlot } from '@/src/utils/storage';

const STORAGE_KEY = '@separata:chordDictionaryCollapsed';

const slot = createStorageSlot(STORAGE_KEY);

let cached = false;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(v: boolean) => void>();

function persist(value: boolean) {
  slot.write(value ? '1' : '0');
}

function notify() {
  listeners.forEach((fn) => fn(cached));
}

function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = slot.read().then((result) => {
    if (result.ok && result.value !== null) cached = result.value === '1';
    hydrated = true;
    notify();
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
