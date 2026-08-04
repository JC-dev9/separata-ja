// `jest.isolateModules` precisa de `require` para reimportar os stores com o
// cache limpo — cada teste tem de arrancar com o estado zerado.
/* eslint-disable @typescript-eslint/no-require-imports */
import AsyncStorage from '@react-native-async-storage/async-storage';

type Favoritos = typeof import('../useFavorites');
type Edicoes = typeof import('../useSongOverride');

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

const FAVORITOS = '@separata:favorites';
const EDICOES = '@separata:song-overrides';

async function carregarFavoritos({ leituraFalha = false } = {}): Promise<Favoritos> {
  if (leituraFalha) getItem.mockRejectedValueOnce(new Error('disco'));
  let store!: Favoritos;
  jest.isolateModules(() => {
    store = require('../useFavorites');
  });
  await store.hydrateFavorites();
  return store;
}

async function carregarEdicoes({ leituraFalha = false } = {}): Promise<Edicoes> {
  if (leituraFalha) getItem.mockRejectedValueOnce(new Error('disco'));
  let store!: Edicoes;
  jest.isolateModules(() => {
    store = require('../useSongOverride');
  });
  await store.hydrateOverrides();
  return store;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  getItem.mockClear();
  setItem.mockClear();
  removeItem.mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('clearAllFavorites', () => {
  it('apaga a chave do disco', async () => {
    await AsyncStorage.setItem(FAVORITOS, JSON.stringify([1, 2, 3]));
    const store = await carregarFavoritos();

    expect(await store.clearAllFavorites()).toBe(true);
    expect(await AsyncStorage.getItem(FAVORITOS)).toBeNull();
  });

  it('devolve false quando não consegue apagar', async () => {
    await AsyncStorage.setItem(FAVORITOS, JSON.stringify([1]));
    const store = await carregarFavoritos();

    // A tela precisa de saber para poder avisar: em memória ficou vazio, mas o
    // arranque seguinte traz os favoritos de volta.
    removeItem.mockRejectedValueOnce(new Error('disco'));
    expect(await store.clearAllFavorites()).toBe(false);
    expect(await AsyncStorage.getItem(FAVORITOS)).toBe(JSON.stringify([1]));
  });

  it('apaga mesmo com a hidratação falhada', async () => {
    await AsyncStorage.setItem(FAVORITOS, JSON.stringify([7, 42]));
    const store = await carregarFavoritos({ leituraFalha: true });

    expect(await store.clearAllFavorites()).toBe(true);
    expect(await AsyncStorage.getItem(FAVORITOS)).toBeNull();
  });
});

describe('clearAllOverrides', () => {
  it('apaga a chave do disco', async () => {
    const store = await carregarEdicoes();
    await store.setOverrideFor(1, '[C]Santo', 'abc');

    expect(await store.clearAllOverrides()).toBe(true);
    expect(await AsyncStorage.getItem(EDICOES)).toBeNull();
  });

  it('baixa o aviso de gravação falhada', async () => {
    const store = await carregarEdicoes();
    setItem.mockRejectedValueOnce(new Error('disco cheio'));
    await store.setOverrideFor(1, '[C]Santo', 'abc');
    expect(store.hasSaveFailed()).toBe(true);

    // Já não há edições para gravar, por isso o aviso deixou de ter assunto.
    await store.clearAllOverrides();
    expect(store.hasSaveFailed()).toBe(false);
  });

  it('apaga o disco mesmo com a hidratação falhada', async () => {
    await AsyncStorage.setItem(EDICOES, JSON.stringify({ 9: { content: 'antigo', baseHash: 'h' } }));
    const store = await carregarEdicoes({ leituraFalha: true });

    // O contraponto deliberado a save-failure.test.ts: nas mesmas condições uma
    // *gravação* é recusada, porque passaria por cima de edições que nunca
    // chegámos a ler. Apagar é ordem explícita do utilizador e dá o mesmo
    // resultado com ou sem saber o que lá estava.
    expect(await store.clearAllOverrides()).toBe(true);
    expect(await AsyncStorage.getItem(EDICOES)).toBeNull();
  });

  it('devolve false quando não consegue apagar', async () => {
    const store = await carregarEdicoes();
    await store.setOverrideFor(1, '[C]Santo', 'abc');

    removeItem.mockRejectedValueOnce(new Error('disco'));
    expect(await store.clearAllOverrides()).toBe(false);
    expect(await AsyncStorage.getItem(EDICOES)).toContain('[C]Santo');
  });
});

describe('resetSettings', () => {
  it('repõe as três preferências e apaga as chaves', async () => {
    await AsyncStorage.multiSet([
      ['@separata:fontSize', '26'],
      ['@separata:chordDictionaryCollapsed', '1'],
      ['@separata:defaultInstrument', 'piano'],
    ]);

    let mod!: typeof import('../resetSettings');
    let fonte!: typeof import('../useFontSize');
    let dicionario!: typeof import('../useChordDictionaryCollapsed');
    let instrumento!: typeof import('../useDefaultInstrument');
    jest.isolateModules(() => {
      fonte = require('../useFontSize');
      dicionario = require('../useChordDictionaryCollapsed');
      instrumento = require('../useDefaultInstrument');
      mod = require('../resetSettings');
    });
    await Promise.all([
      fonte.fontSizePreference.hydrate(),
      dicionario.chordDictionaryCollapsedPreference.hydrate(),
      instrumento.defaultInstrumentPreference.hydrate(),
    ]);

    expect(await mod.resetSettings()).toBe(true);

    expect(fonte.fontSizePreference.get()).toBe(19);
    expect(dicionario.chordDictionaryCollapsedPreference.get()).toBe(false);
    expect(instrumento.defaultInstrumentPreference.get()).toBe('guitar');
    expect(await AsyncStorage.getItem('@separata:fontSize')).toBeNull();
    expect(await AsyncStorage.getItem('@separata:defaultInstrument')).toBeNull();
  });

  it('não toca nos favoritos nem nas edições', async () => {
    await AsyncStorage.multiSet([
      ['@separata:fontSize', '26'],
      [FAVORITOS, JSON.stringify([1, 2])],
      [EDICOES, JSON.stringify({ 3: { content: 'x', baseHash: 'h' } })],
    ]);

    let mod!: typeof import('../resetSettings');
    jest.isolateModules(() => {
      mod = require('../resetSettings');
    });
    await mod.resetSettings();

    // São conteúdo do utilizador, não definições — têm cada um o seu botão.
    expect(await AsyncStorage.getItem(FAVORITOS)).toBe(JSON.stringify([1, 2]));
    expect(await AsyncStorage.getItem(EDICOES)).toContain('baseHash');
  });
});
