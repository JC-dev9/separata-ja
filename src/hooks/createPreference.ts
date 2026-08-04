import { useSyncExternalStore } from 'react';

import { createStorageSlot } from '@/src/utils/storage';

/**
 * Uma preferência escalar guardada no dispositivo.
 *
 * O padrão é o mesmo que os favoritos e as edições usam à mão — cache em módulo,
 * conjunto de listeners, `createStorageSlot` — mas para valores simples (um
 * número, um booleano, uma string de um conjunto fechado) era literalmente o
 * mesmo ficheiro copiado. Aqui escreve-se uma vez.
 *
 * Não serve para os favoritos nem para as edições: esses têm colecções, migração
 * de formatos antigos e estado de gravação falhada, e forçá-los nesta forma
 * seria generalizar a mais.
 */
export interface Preference<T> {
  /**
   * Subscreve as mudanças. Para o React, usar `usePreference` — nunca chamar isto
   * directamente num componente.
   */
  subscribe(listener: () => void): () => void;
  /** O valor actual, fora do React. */
  get(): T;
  /** Define e grava. `false` = não chegou ao disco. */
  set(value: T): Promise<boolean>;
  /**
   * Define a partir do valor actual em memória.
   *
   * Não é açúcar sobre o `set`: um incremento escrito como `set(valor + 1)` lê o
   * valor que o React renderizou, e dois toques rápidos no mesmo frame dariam o
   * mesmo resultado. Aqui a base é sempre o que está em memória.
   */
  update(next: (previous: T) => T): Promise<boolean>;
  /** Volta ao valor por omissão e apaga a chave do disco. */
  reset(): Promise<boolean>;
  /** Idempotente. Já é chamada na criação; existe para os testes e a hidratação explícita. */
  hydrate(): Promise<void>;
}

export interface PreferenceOptions<T> {
  key: string;
  defaultValue: T;
  /** `undefined` quando o que está gravado não presta — fica o valor por omissão. */
  parse: (raw: string) => T | undefined;
  serialize: (value: T) => string;
  /** Aplicado a tudo o que entra: o que vem do disco, o `set` e o `update`. */
  normalize?: (value: T) => T;
}

export function createPreference<T>({
  key,
  defaultValue,
  parse,
  serialize,
  normalize,
}: PreferenceOptions<T>): Preference<T> {
  const slot = createStorageSlot(key);
  const clean = (value: T): T => (normalize ? normalize(value) : value);

  let cached: T = clean(defaultValue);
  let hydrated = false;
  let hydrating: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function hydrate(): Promise<void> {
    if (hydrated) return Promise.resolve();
    if (hydrating) return hydrating;
    hydrating = slot.read().then((result) => {
      // Se a leitura falhou ficamos no valor por omissão sem gravar nada — o
      // slot já suspendeu as escritas, por isso o que está no disco fica intacto
      // e reaparece no arranque seguinte.
      if (result.ok && result.value !== null) {
        const parsed = parse(result.value);
        if (parsed !== undefined) cached = clean(parsed);
      }
      hydrated = true;
      notify();
    });
    return hydrating;
  }

  // Arranca já, para o valor estar em memória no primeiro frame em vez de o ecrã
  // piscar do valor por omissão para o do utilizador.
  hydrate();

  function write(value: T): Promise<boolean> {
    cached = clean(value);
    notify();
    return slot.write(serialize(cached));
  }

  function subscribe(listener: () => void) {
    if (!hydrated) hydrate();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot() {
    return cached;
  }

  return {
    subscribe,
    get: getSnapshot,
    set: write,
    update: (next) => write(next(cached)),
    reset() {
      cached = clean(defaultValue);
      notify();
      return slot.clear();
    },
    hydrate,
  };
}

/**
 * Lê uma preferência dentro de um componente.
 *
 * Tem de ser uma função de topo com nome começado por `use`, e não um método do
 * objecto `Preference`. O React Compiler (ligado neste projecto) identifica
 * hooks pelo nome do identificador que é chamado: `pref.use()` é um acesso a
 * propriedade, não um identificador, por isso ele tomava-o por uma chamada
 * normal e memoizava-a — no segundo render o `useSyncExternalStore` deixava de
 * ser chamado e a lista de hooks do componente encolhia a meio da vida dele.
 *
 * `useSyncExternalStore` em vez de useState+useEffect porque o valor vive fora
 * do React e pode chegar depois da montagem (a hidratação é assíncrona). Só é
 * seguro porque `T` é sempre primitivo: a identidade do snapshot mantém-se
 * enquanto o valor não mudar.
 */
export function usePreference<T>(pref: Preference<T>): T {
  return useSyncExternalStore(pref.subscribe, pref.get, pref.get);
}
