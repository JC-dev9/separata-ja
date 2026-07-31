import AsyncStorage from '@react-native-async-storage/async-storage';

// Escritas em AsyncStorage podem falhar (disco cheio, storage corrompido).
// Não há nada de útil a fazer em runtime — o estado em memória continua certo —
// mas engolir o erro em silêncio esconde bugs, por isso deixamos rasto em dev.
export function writeStorage(key: string, value: string): Promise<void> {
  return AsyncStorage.setItem(key, value).catch((err) => {
    if (__DEV__) {
      console.warn(`[storage] falhou a gravar "${key}":`, err);
    }
  });
}

// Leituras falham essencialmente pelas mesmas razões. Devolvemos null para o
// chamador cair no valor por omissão.
export function readStorage(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key).catch((err) => {
    if (__DEV__) {
      console.warn(`[storage] falhou a ler "${key}":`, err);
    }
    return null;
  });
}
