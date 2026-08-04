import { useCallback } from 'react';

import { createPreference, usePreference } from '@/src/hooks/createPreference';

export const chordDictionaryCollapsedPreference = createPreference<boolean>({
  key: '@separata:chordDictionaryCollapsed',
  defaultValue: false,
  parse: (raw) => (raw === '1' ? true : raw === '0' ? false : undefined),
  serialize: (collapsed) => (collapsed ? '1' : '0'),
});

export function useChordDictionaryCollapsed() {
  const collapsed = usePreference(chordDictionaryCollapsedPreference);

  const toggle = useCallback(
    () => void chordDictionaryCollapsedPreference.update((value) => !value),
    [],
  );
  const setCollapsed = useCallback(
    (value: boolean) => void chordDictionaryCollapsedPreference.set(value),
    [],
  );

  return { collapsed, toggle, setCollapsed };
}
