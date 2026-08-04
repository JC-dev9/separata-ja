import { chordDictionaryCollapsedPreference } from '@/src/hooks/useChordDictionaryCollapsed';
import { defaultInstrumentPreference } from '@/src/hooks/useDefaultInstrument';
import { fontSizePreference } from '@/src/hooks/useFontSize';

/**
 * Repõe as preferências de leitura nos valores por omissão.
 *
 * Não toca nos favoritos nem nas edições — esses são conteúdo do utilizador, não
 * definições, e têm cada um o seu botão. `false` = pelo menos uma não ficou
 * apagada no disco e vai reaparecer no arranque seguinte.
 */
export function resetSettings(): Promise<boolean> {
  return Promise.all([
    fontSizePreference.reset(),
    chordDictionaryCollapsedPreference.reset(),
    defaultInstrumentPreference.reset(),
  ]).then((results) => results.every(Boolean));
}
