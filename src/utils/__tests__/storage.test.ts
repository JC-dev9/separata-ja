import AsyncStorage from '@react-native-async-storage/async-storage';

import { createStorageSlot, readStorage, removeStorage, writeStorage } from '../storage';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

const KEY = '@teste:chave';

beforeEach(async () => {
  await AsyncStorage.clear();
  getItem.mockClear();
  setItem.mockClear();
  removeItem.mockClear();
  // As falhas de I/O passam por console.warn em dev; não queremos ruído no CI.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('readStorage', () => {
  it('devolve o valor quando a chave existe', async () => {
    await AsyncStorage.setItem(KEY, 'olá');
    expect(await readStorage(KEY)).toEqual({ ok: true, value: 'olá' });
  });

  it('devolve value null quando a chave não existe', async () => {
    expect(await readStorage(KEY)).toEqual({ ok: true, value: null });
  });

  it('devolve ok:false quando o AsyncStorage falha, em vez de rejeitar', async () => {
    getItem.mockRejectedValueOnce(new Error('disco'));
    expect(await readStorage(KEY)).toEqual({ ok: false });
  });

  it('distingue chave inexistente de falha de leitura', async () => {
    const ausente = await readStorage(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    const falhada = await readStorage(KEY);

    // É esta distinção que impede a app de tomar um erro de I/O por
    // "utilizador sem dados" e gravar valores por omissão por cima.
    expect(ausente.ok).toBe(true);
    expect(falhada.ok).toBe(false);
  });
});

describe('writeStorage', () => {
  it('devolve true quando grava', async () => {
    expect(await writeStorage(KEY, 'v')).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBe('v');
  });

  it('devolve false quando falha, em vez de rejeitar', async () => {
    setItem.mockRejectedValueOnce(new Error('disco cheio'));
    expect(await writeStorage(KEY, 'v')).toBe(false);
  });
});

describe('removeStorage', () => {
  it('devolve true quando apaga', async () => {
    await AsyncStorage.setItem(KEY, 'v');
    expect(await removeStorage(KEY)).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('devolve false quando falha, em vez de rejeitar', async () => {
    removeItem.mockRejectedValueOnce(new Error('disco'));
    expect(await removeStorage(KEY)).toBe(false);
  });
});

describe('createStorageSlot', () => {
  it('grava normalmente depois de uma leitura bem sucedida', async () => {
    const slot = createStorageSlot(KEY);
    await slot.read();

    expect(slot.isBlocked()).toBe(false);
    expect(await slot.write('novo')).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBe('novo');
  });

  it('grava na primeira utilização quando a chave ainda não existe', async () => {
    const slot = createStorageSlot(KEY);
    const result = await slot.read();

    expect(result).toEqual({ ok: true, value: null });
    expect(await slot.write('primeiro')).toBe(true);
  });

  it('não apaga dados no disco quando a leitura inicial falha', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([1, 2, 3]));

    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();

    // Cenário da perda permanente: a leitura falhou, o estado em memória é o
    // valor por omissão, e o utilizador mexe em algo. Gravar aqui apagaria os
    // dados que continuam intactos no disco.
    getItem.mockRejectedValueOnce(new Error('disco'));
    expect(await slot.write(JSON.stringify([]))).toBe(false);
    expect(await AsyncStorage.getItem(KEY)).toBe(JSON.stringify([1, 2, 3]));
  });

  it('reporta isBlocked depois de uma leitura falhada', async () => {
    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();

    expect(slot.isBlocked()).toBe(true);
  });

  it('desbloqueia se a falha foi passageira e o disco está mesmo vazio', async () => {
    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('falha passageira'));
    await slot.read();
    expect(slot.isBlocked()).toBe(true);

    // A segunda leitura já resulta e confirma que não há nada a perder.
    expect(await slot.write('v')).toBe(true);
    expect(slot.isBlocked()).toBe(false);
    expect(await AsyncStorage.getItem(KEY)).toBe('v');
  });

  it('continua bloqueado se a re-leitura encontrar dados que nunca carregou', async () => {
    await AsyncStorage.setItem(KEY, 'dados-do-utilizador');

    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();

    // A re-leitura funciona, mas revela conteúdo que o estado em memória não
    // conhece. Fundir às cegas seria adivinhar, por isso ficamos em só-leitura.
    expect(await slot.write('estado-em-memoria')).toBe(false);
    expect(slot.isBlocked()).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBe('dados-do-utilizador');
  });

  it('só tenta a re-leitura uma vez, não a cada escrita', async () => {
    await AsyncStorage.setItem(KEY, 'dados');

    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();

    getItem.mockClear();
    await slot.write('a');
    await slot.write('b');
    await slot.write('c');

    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('mantém as escritas suspensas mesmo que a re-leitura também falhe', async () => {
    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();

    getItem.mockRejectedValueOnce(new Error('disco outra vez'));
    expect(await slot.write('v')).toBe(false);
    expect(slot.isBlocked()).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('apaga o que está no disco mesmo com as escritas suspensas', async () => {
    await AsyncStorage.setItem(KEY, 'dados-do-utilizador');

    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();
    expect(slot.isBlocked()).toBe(true);

    // O contraponto deliberado ao teste de cima: uma *gravação* nestas condições
    // apagaria dados por acidente e por isso é recusada; um clear() é uma ordem
    // explícita do utilizador e dá o mesmo resultado com ou sem saber o que lá
    // estava.
    expect(await slot.clear()).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('levanta a suspensão depois de um clear bem sucedido', async () => {
    await AsyncStorage.setItem(KEY, 'dados');

    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();

    await slot.clear();

    // Memória e disco voltaram a estar de acordo: os dois estão vazios.
    expect(slot.isBlocked()).toBe(false);
    expect(await slot.write('novo')).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBe('novo');
  });

  it('mantém a suspensão se o clear falhar', async () => {
    await AsyncStorage.setItem(KEY, 'dados');

    const slot = createStorageSlot(KEY);
    getItem.mockRejectedValueOnce(new Error('disco'));
    await slot.read();

    removeItem.mockRejectedValueOnce(new Error('disco'));
    expect(await slot.clear()).toBe(false);
    expect(slot.isBlocked()).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBe('dados');
  });

  it('isola chaves diferentes', async () => {
    const bloqueado = createStorageSlot('@teste:a');
    const saudavel = createStorageSlot('@teste:b');

    getItem.mockRejectedValueOnce(new Error('disco'));
    await bloqueado.read();
    await saudavel.read();

    expect(bloqueado.isBlocked()).toBe(true);
    expect(saudavel.isBlocked()).toBe(false);
    expect(await saudavel.write('v')).toBe(true);
  });
});
