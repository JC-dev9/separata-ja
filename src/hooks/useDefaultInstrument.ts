import { useCallback } from 'react';

import { createPreference, usePreference } from '@/src/hooks/createPreference';
import { Instrument } from '@/src/types/song';

export const defaultInstrumentPreference = createPreference<Instrument>({
  key: '@separata:defaultInstrument',
  defaultValue: 'guitar',
  parse: (raw) => (raw === 'guitar' || raw === 'piano' ? raw : undefined),
  serialize: (instrument) => instrument,
});

/**
 * O instrumento em que os diagramas de acordes abrem.
 *
 * É o valor **inicial** de cada música, não uma imposição: trocar de instrumento
 * dentro de um hino vale só para essa sessão (ver `app/song/[id].tsx`).
 */
export function useDefaultInstrument() {
  const instrument = usePreference(defaultInstrumentPreference);
  const setInstrument = useCallback(
    (next: Instrument) => void defaultInstrumentPreference.set(next),
    [],
  );

  return { instrument, setInstrument };
}
