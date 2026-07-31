export interface StabilityOptions {
  /** Quantas leituras recentes entram na decisão. */
  historySize: number;
  /** Quantas dessas têm de concordar para aceitarmos uma nota. */
  requiredAgreeing: number;
  /** Dispersão máxima, em cents, para duas leituras contarem como a mesma nota. */
  agreementCents: number;
  /** Salto que indica nota nova atacada — o histórico é deitado fora. */
  resetCents: number;
}

/**
 * Segunda porta contra ruído, a seguir ao YIN.
 *
 * O YIN já rejeita o que não é periódico, mas uma voz humana **é** periódica e
 * cai na mesma gama do violão (85-180 Hz num homem adulto sobrepõe-se às
 * cordas E2, A2 e D3). Por periodicidade é impossível distingui-las.
 *
 * O que as separa é o comportamento no tempo: uma corda dedilhada sustenta a
 * mesma altura durante segundos, enquanto a fala muda de altura a cada sílaba.
 * Esta porta exige que várias leituras seguidas concordem entre si, por isso
 * uma vogal solta não chega para acender uma nota — mas uma corda a soar sim.
 *
 * Devolve a **mediana** das leituras concordantes (robusta a outliers, ao
 * contrário de uma média) ou `null` enquanto não houver acordo suficiente.
 */
export const DEFAULT_STABILITY: StabilityOptions = {
  historySize: 7,
  requiredAgreeing: 4,
  agreementCents: 20,
  resetCents: 200,
};

export function centsBetween(a: number, b: number): number {
  return 1200 * Math.log2(a / b);
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface StabilityGate {
  /** Junta uma leitura. Devolve a nota aceite, ou null se ainda não há acordo. */
  push: (frequency: number) => number | null;
  reset: () => void;
}

/** Leituras discrepantes necessárias para aceitar que a nota mudou. */
const JUMP_CONFIRMATIONS = 2;

/**
 * O mesmo, quando já há uma nota fixada. Ser mais exigente para *largar* uma
 * nota do que para a adquirir é o que impede o mostrador de alternar entre a
 * corda e uma voz que fale por cima dela.
 */
const LOCKED_JUMP_CONFIRMATIONS = 3;

export function createStabilityGate(
  options: StabilityOptions = DEFAULT_STABILITY,
): StabilityGate {
  let history: number[] = [];
  let pending: number[] = [];
  let lastStable: number | null = null;

  return {
    push(frequency: number): number | null {
      if (!isFinite(frequency) || frequency <= 0) return lastStable;

      if (history.length === 0) {
        history = [frequency];
        pending = [];
        return null;
      }

      // Comparamos com a mediana, não com a última leitura: assim um valor
      // espúrio isolado não serve de referência para os seguintes.
      const reference = median(history);

      if (Math.abs(centsBetween(frequency, reference)) > options.resetCents) {
        // Pode ser nota nova ou apenas ruído a sobrepor-se. Só deitamos fora
        // o histórico depois de a mudança se confirmar — caso contrário um
        // pico isolado obrigava a guitarra a fixar tudo de novo.
        pending.push(frequency);
        const needed = lastStable != null ? LOCKED_JUMP_CONFIRMATIONS : JUMP_CONFIRMATIONS;
        if (pending.length >= needed) {
          history = pending.slice(-options.historySize);
          pending = [];
          lastStable = null;
          return null;
        }
        // Enquanto não confirma, mantemos a nota já fixada em vez de apagar:
        // é a passagem por vazio que se lia como alternância.
        return lastStable;
      }

      pending = [];
      history.push(frequency);
      if (history.length > options.historySize) history.shift();

      const candidate = median(history);
      const agreeing = history.filter(
        (f) => Math.abs(centsBetween(f, candidate)) <= options.agreementCents,
      );

      if (agreeing.length < options.requiredAgreeing) return lastStable;

      // Mediana só das concordantes: as dispersas não puxam o valor final.
      lastStable = median(agreeing);
      return lastStable;
    },

    reset() {
      history = [];
      pending = [];
      lastStable = null;
    },
  };
}
