import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Resultado de uma leitura.
 *
 * Separar "falhou a ler" de "a chave não existe" é o ponto todo deste módulo:
 * se as duas coisas derem `null`, um erro de I/O passageiro passa por
 * "utilizador sem dados" e a app grava os valores por omissão por cima do que
 * está no disco — perda permanente causada por uma falha temporária.
 */
export type ReadResult = { ok: true; value: string | null } | { ok: false };

// Sem crash reporting ligado não há para onde enviar isto em produção. Quando
// houver Sentry, é aqui que se reporta (ver ErrorBoundary).
function warn(message: string, err: unknown) {
  if (__DEV__) console.warn(`[storage] ${message}`, err);
}

/** Lê uma chave. Nunca rejeita — o erro vem no `ok: false`. */
export function readStorage(key: string): Promise<ReadResult> {
  return AsyncStorage.getItem(key).then(
    (value): ReadResult => ({ ok: true, value }),
    (err): ReadResult => {
      warn(`falhou a ler "${key}":`, err);
      return { ok: false };
    },
  );
}

/** Grava uma chave. Nunca rejeita — devolve `false` se não conseguiu gravar. */
export function writeStorage(key: string, value: string): Promise<boolean> {
  return AsyncStorage.setItem(key, value).then(
    () => true,
    (err) => {
      warn(`falhou a gravar "${key}":`, err);
      return false;
    },
  );
}

/** Apaga uma chave. Nunca rejeita — devolve `false` se não conseguiu apagar. */
export function removeStorage(key: string): Promise<boolean> {
  return AsyncStorage.removeItem(key).then(
    () => true,
    (err) => {
      warn(`falhou a apagar "${key}":`, err);
      return false;
    },
  );
}

export interface StorageSlot {
  /** Lê a chave e, se falhar, suspende as escritas seguintes. */
  read(): Promise<ReadResult>;
  /** Grava, excepto em modo só-leitura. `false` = não ficou gravado. */
  write(value: string): Promise<boolean>;
  /** Apaga a chave por ordem explícita do utilizador. `false` = não foi apagada. */
  clear(): Promise<boolean>;
  /** `true` enquanto as escritas estiverem suspensas por hidratação falhada. */
  isBlocked(): boolean;
}

/**
 * Uma chave de AsyncStorage que se recusa a apagar dados que nunca chegou a ler.
 *
 * Se a leitura inicial falhar, o estado em memória são valores por omissão, mas
 * o disco pode ter os favoritos ou as edições do utilizador. Gravar nessa
 * situação apaga-os. Por isso o slot entra em modo só-leitura até ao próximo
 * arranque — a sessão perde a persistência, o que é mau, mas recuperável; o
 * arranque seguinte volta a ler e tudo aparece.
 */
export function createStorageSlot(key: string): StorageSlot {
  let blocked = false;
  let retried = false;

  return {
    read() {
      return readStorage(key).then((result) => {
        blocked = !result.ok;
        return result;
      });
    },

    write(value) {
      if (!blocked) return writeStorage(key, value);
      if (retried) return Promise.resolve(false);
      retried = true;

      // Segunda oportunidade: a falha no arranque pode ter sido passageira. Só
      // desbloqueamos se o disco estiver mesmo vazio — se tiver dados que não
      // carregámos, ficamos em só-leitura, porque fundi-los às cegas com o
      // estado em memória seria adivinhar o que o utilizador quer manter.
      return readStorage(key).then((result) => {
        if (!result.ok || result.value !== null) return false;
        blocked = false;
        return writeStorage(key, value);
      });
    },

    // Apagar é a única operação que atravessa o modo só-leitura. O slot suspende
    // as escritas porque o estado em memória não representa o disco — mas apagar
    // dá o mesmo resultado com ou sem esse conhecimento, e aqui não é a app a
    // gravar valores por omissão por acidente: é o utilizador a pedir. Se
    // resultar, memória e disco voltam a estar de acordo, e a suspensão deixa de
    // fazer sentido.
    clear() {
      return removeStorage(key).then((ok) => {
        if (ok) {
          blocked = false;
          retried = false;
        }
        return ok;
      });
    },

    isBlocked() {
      return blocked;
    },
  };
}
