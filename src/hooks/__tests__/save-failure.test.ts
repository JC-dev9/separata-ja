// `jest.isolateModules` precisa de `require` para reimportar o módulo com o
// cache limpo — cada teste tem de arrancar com o estado do store zerado.
/* eslint-disable @typescript-eslint/no-require-imports */
import AsyncStorage from '@react-native-async-storage/async-storage';

type Store = typeof import('../useSongOverride');

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

const KEY = '@separata:song-overrides';

/** Importa o store já hidratado, opcionalmente com a leitura inicial a falhar. */
async function carregarStore({ leituraFalha = false } = {}): Promise<Store> {
  if (leituraFalha) getItem.mockRejectedValueOnce(new Error('disco'));
  let store!: Store;
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
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('gravação bem sucedida', () => {
  it('não levanta aviso', async () => {
    const store = await carregarStore();
    await store.setOverrideFor(1, '[C]Santo', 'abc');

    expect(store.hasSaveFailed()).toBe(false);
    expect(await AsyncStorage.getItem(KEY)).toContain('[C]Santo');
  });

  it('também grava ao limpar uma edição', async () => {
    const store = await carregarStore();
    await store.setOverrideFor(1, '[C]Santo', 'abc');
    await store.clearOverrideFor(1);

    expect(store.hasSaveFailed()).toBe(false);
    expect(await AsyncStorage.getItem(KEY)).toBe('{}');
  });
});

describe('gravação falhada', () => {
  it('levanta aviso quando o disco recusa a escrita', async () => {
    const store = await carregarStore();
    setItem.mockRejectedValueOnce(new Error('disco cheio'));

    await store.setOverrideFor(1, '[C]Santo', 'abc');

    expect(store.hasSaveFailed()).toBe(true);
  });

  it('levanta aviso quando as escritas estão suspensas por hidratação falhada', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ 9: { content: 'antigo', baseHash: 'h' } }));
    const store = await carregarStore({ leituraFalha: true });

    // A re-tentativa do slot encontra as edições que não chegaram a ser lidas,
    // por isso continua em só-leitura — e o utilizador tem de saber disso.
    await store.setOverrideFor(1, '[C]Santo', 'abc');

    expect(store.hasSaveFailed()).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toContain('antigo');
  });

  it('mantém a edição em memória apesar de não a gravar', async () => {
    const store = await carregarStore();

    setItem.mockRejectedValueOnce(new Error('disco cheio'));
    await store.setOverrideFor(1, '[C]Santo', 'abc');

    // A edição falhada continua a alimentar o ecrã — o utilizador não pode
    // perder o texto no mesmo instante em que o escreveu. Prova-se pela
    // gravação seguinte, que leva as duas edições para o disco.
    await store.setOverrideFor(2, '[G]Aleluia', 'def');

    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).toContain('[C]Santo');
    expect(raw).toContain('[G]Aleluia');
  });

  it('baixa o aviso quando a gravação seguinte resulta', async () => {
    const store = await carregarStore();
    setItem.mockRejectedValueOnce(new Error('disco cheio'));

    await store.setOverrideFor(1, '[C]Santo', 'abc');
    expect(store.hasSaveFailed()).toBe(true);

    await store.setOverrideFor(1, '[G]Santo', 'abc');
    expect(store.hasSaveFailed()).toBe(false);
  });

  it('o aviso é por store, não fica preso de um teste para o outro', async () => {
    const store = await carregarStore();
    expect(store.hasSaveFailed()).toBe(false);
  });
});
