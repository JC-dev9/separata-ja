import { useCallback } from 'react';

import { createPreference, usePreference } from '@/src/hooks/createPreference';

export const DEFAULT_FONT_SIZE = 19;
export const MIN_FONT = 12;
export const MAX_FONT = 28;

export const fontSizePreference = createPreference<number>({
  key: '@separata:fontSize',
  defaultValue: DEFAULT_FONT_SIZE,
  parse: (raw) => {
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? undefined : parsed;
  },
  serialize: String,
  // O clamp vive aqui e não no `changeFont` para valer também para o que vem do
  // disco — uma versão antiga da app, ou o dedo de alguém no AsyncStorage, não
  // devem conseguir pôr o texto a um tamanho ilegível.
  normalize: (size) => Math.min(MAX_FONT, Math.max(MIN_FONT, size)),
});

export function useFontSize() {
  const fontSize = usePreference(fontSizePreference);

  const changeFont = useCallback(
    (delta: number) => void fontSizePreference.update((size) => size + delta),
    [],
  );
  const setFontSize = useCallback((size: number) => void fontSizePreference.set(size), []);

  return { fontSize, changeFont, setFontSize };
}
