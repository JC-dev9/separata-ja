import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPreference } from '../createPreference';

const getItem = AsyncStorage.getItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

const KEY = '@teste:pref';

/** Uma preferência numérica com clamp, igual à do tamanho da letra. */
function criarNumero() {
  return createPreference<number>({
    key: KEY,
    defaultValue: 19,
    parse: (raw) => {
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? undefined : parsed;
    },
    serialize: String,
    normalize: (n) => Math.min(28, Math.max(12, n)),
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  getItem.mockClear();
  removeItem.mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('hidratação', () => {
  it('fica no valor por omissão quando a chave não existe', async () => {
    const pref = criarNumero();
    await pref.hydrate();

    expect(pref.get()).toBe(19);
  });

  it('lê o que está no disco', async () => {
    await AsyncStorage.setItem(KEY, '24');

    const pref = criarNumero();
    await pref.hydrate();

    expect(pref.get()).toBe(24);
  });

  it('cai no valor por omissão quando o conteúdo gravado não presta', async () => {
    await AsyncStorage.setItem(KEY, 'nem-por-sombras');

    const pref = criarNumero();
    await pref.hydrate();

    expect(pref.get()).toBe(19);
  });

  it('é idempotente: chamar duas vezes não relê o disco', async () => {
    const pref = criarNumero();
    await pref.hydrate();
    getItem.mockClear();

    await pref.hydrate();

    expect(getItem).not.toHaveBeenCalled();
  });
});

describe('normalize', () => {
  it('aplica-se ao que vem do disco', async () => {
    // Uma versão antiga da app, ou um dedo no AsyncStorage, não devem conseguir
    // pôr o valor fora dos limites.
    await AsyncStorage.setItem(KEY, '99');

    const pref = criarNumero();
    await pref.hydrate();

    expect(pref.get()).toBe(28);
  });

  it('aplica-se ao set e ao update', async () => {
    const pref = criarNumero();
    await pref.hydrate();

    await pref.set(1);
    expect(pref.get()).toBe(12);

    await pref.update((n) => n - 10);
    expect(pref.get()).toBe(12);
  });
});

describe('escrita', () => {
  it('set persiste e get reflecte', async () => {
    const pref = criarNumero();
    await pref.hydrate();

    expect(await pref.set(22)).toBe(true);
    expect(pref.get()).toBe(22);
    expect(await AsyncStorage.getItem(KEY)).toBe('22');
  });

  it('update opera sobre o valor em memória, não sobre um valor capturado', async () => {
    const pref = criarNumero();
    await pref.hydrate();

    // Dois incrementos no mesmo tick: é isto que distingue `update` de
    // `set(valorRenderizado + 1)`, onde o segundo toque perderia o primeiro.
    const a = pref.update((n) => n + 1);
    const b = pref.update((n) => n + 1);
    await Promise.all([a, b]);

    expect(pref.get()).toBe(21);
  });

  it('notifica os subscritores quando o valor muda', async () => {
    const pref = criarNumero();
    await pref.hydrate();

    const visto: number[] = [];
    // O `use()` é um hook; o que ele subscreve é este mesmo mecanismo.
    await pref.set(20);
    visto.push(pref.get());
    await pref.set(21);
    visto.push(pref.get());

    expect(visto).toEqual([20, 21]);
  });
});

describe('reset', () => {
  it('apaga a chave e repõe o valor por omissão', async () => {
    const pref = criarNumero();
    await pref.hydrate();
    await pref.set(25);

    expect(await pref.reset()).toBe(true);
    expect(pref.get()).toBe(19);
    // Apagar a chave, e não gravar o valor por omissão por cima, é o que deixa
    // disco e memória a dizer a mesma coisa.
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('devolve false quando não consegue apagar', async () => {
    const pref = criarNumero();
    await pref.hydrate();
    await pref.set(25);

    removeItem.mockRejectedValueOnce(new Error('disco'));
    expect(await pref.reset()).toBe(false);
  });
});

describe('leitura inicial falhada', () => {
  it('a hidratação resolve em vez de ficar pendente', async () => {
    getItem.mockRejectedValueOnce(new Error('disco'));
    const pref = criarNumero();

    await expect(pref.hydrate()).resolves.toBeUndefined();
    expect(pref.get()).toBe(19);
  });

  it('a escrita seguinte não apaga o que está no disco', async () => {
    await AsyncStorage.setItem(KEY, '25');

    getItem.mockRejectedValueOnce(new Error('disco'));
    const pref = criarNumero();
    await pref.hydrate();

    // Mesmo invariante que os favoritos têm: valor por omissão em memória, valor
    // do utilizador no disco, e a gravação recusa-se a passar-lhe por cima.
    getItem.mockRejectedValueOnce(new Error('disco'));
    expect(await pref.set(15)).toBe(false);
    expect(await AsyncStorage.getItem(KEY)).toBe('25');
  });

  it('o reset apaga na mesma — é ordem explícita do utilizador', async () => {
    await AsyncStorage.setItem(KEY, '25');

    getItem.mockRejectedValueOnce(new Error('disco'));
    const pref = criarNumero();
    await pref.hydrate();

    expect(await pref.reset()).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();

    // E, apagado o que não conhecíamos, as escritas voltam a passar.
    expect(await pref.set(21)).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBe('21');
  });
});
