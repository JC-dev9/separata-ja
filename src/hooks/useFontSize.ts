import { useCallback, useEffect, useState } from 'react';

import { createStorageSlot } from '@/src/utils/storage';

const STORAGE_KEY = '@psalterio:fontSize';
const DEFAULT_FONT_SIZE = 19;
const MIN_FONT = 12;
const MAX_FONT = 28;

const slot = createStorageSlot(STORAGE_KEY);

let cached: number = DEFAULT_FONT_SIZE;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<(size: number) => void>();

function persist(size: number) {
  slot.write(String(size));
}

function notify() {
  listeners.forEach((fn) => fn(cached));
}

function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = slot.read().then((result) => {
    // Se a leitura falhou ficamos no valor por omissão sem gravar nada, para não
    // apagar o tamanho que o utilizador tinha escolhido.
    if (result.ok) {
      const parsed = result.value !== null ? parseInt(result.value, 10) : NaN;
      cached = !isNaN(parsed) ? Math.min(MAX_FONT, Math.max(MIN_FONT, parsed)) : DEFAULT_FONT_SIZE;
    }
    hydrated = true;
    notify();
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
