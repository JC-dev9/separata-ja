// `jest.isolateModules` precisa de `require` para reimportar os hooks com o
// cache de módulos limpo — é a única forma de reproduzir o arranque da app.
/* eslint-disable @typescript-eslint/no-require-imports */
import AsyncStorage from '@react-native-async-storage/async-storage';

const getItem = AsyncStorage.getItem as jest.Mock;

/**
 * Os hooks arrancam a hidratação no próprio import (para o ecrã inicial poder
 * pintar os corações no primeiro frame), por isso o cenário de falha tem de ser
 * armado antes do `require`.
 */
function importarComLeituraFalhada<T>(caminho: string): T {
  getItem.mockRejectedValueOnce(new Error('disco'));
  let mod!: T;
  jest.isolateModules(() => {
    mod = require(caminho);
  });
  return mod;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  getItem.mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('hidratação com leitura falhada', () => {
  it('favoritos: a hidratação resolve em vez de ficar pendente', async () => {
    const mod = importarComLeituraFalhada<typeof import('../useFavorites')>('../useFavorites');

    // Se isto ficasse pendente, o ecrã inicial ficava preso em `loading`.
    await expect(mod.hydrateFavorites()).resolves.toBeUndefined();
  });

  it('edições: a hidratação resolve em vez de ficar pendente', async () => {
    const mod =
      importarComLeituraFalhada<typeof import('../useSongOverride')>('../useSongOverride');

    await expect(mod.hydrateOverrides()).resolves.toBeUndefined();
  });

  it('favoritos: uma leitura falhada não deixa os dados no disco em risco', async () => {
    await AsyncStorage.setItem('@separata:favorites', JSON.stringify([7, 42]));

    const mod = importarComLeituraFalhada<typeof import('../useFavorites')>('../useFavorites');
    await mod.hydrateFavorites();

    // A app arranca sem favoritos visíveis — mau, mas temporário. O que não
    // pode acontecer é a próxima gravação levar os do disco à frente.
    expect(await AsyncStorage.getItem('@separata:favorites')).toBe(JSON.stringify([7, 42]));
  });
});

describe('hidratação normal', () => {
  it('favoritos: lê o que está no disco', async () => {
    await AsyncStorage.setItem('@separata:favorites', JSON.stringify([1, 2]));

    let mod!: typeof import('../useFavorites');
    jest.isolateModules(() => {
      mod = require('../useFavorites');
    });
    await mod.hydrateFavorites();

    expect(getItem).toHaveBeenCalledWith('@separata:favorites');
  });

  it('edições: dados corrompidos são recuperáveis, ao contrário de I/O falhado', async () => {
    await AsyncStorage.setItem('@separata:song-overrides', '{isto não é json');

    let mod!: typeof import('../useSongOverride');
    jest.isolateModules(() => {
      mod = require('../useSongOverride');
    });

    await expect(mod.hydrateOverrides()).resolves.toBeUndefined();
  });
});
