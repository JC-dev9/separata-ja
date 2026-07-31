import {
  centsBetween,
  createStabilityGate,
  DEFAULT_STABILITY,
  median,
} from '../pitch-stability';

/** Frequência a N cents de uma referência. */
function atCents(base: number, cents: number): number {
  return base * Math.pow(2, cents / 1200);
}

describe('median', () => {
  it('devolve o valor do meio num número ímpar de elementos', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('faz a média dos dois centrais num número par', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('não altera o array recebido', () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('createStabilityGate — corda sustentada', () => {
  it('não aceita nota antes de haver leituras suficientes', () => {
    const gate = createStabilityGate();
    // requiredAgreeing = 4: as três primeiras não chegam.
    expect(gate.push(110)).toBeNull();
    expect(gate.push(110)).toBeNull();
    expect(gate.push(110)).toBeNull();
  });

  it('aceita quando leituras suficientes concordam', () => {
    const gate = createStabilityGate();
    gate.push(110);
    gate.push(110);
    gate.push(110);
    expect(gate.push(110)).toBeCloseTo(110, 5);
  });

  it('tolera pequenas variações dentro da margem de acordo', () => {
    const gate = createStabilityGate();
    let result: number | null = null;
    // Uma corda real oscila alguns cents — tem de continuar a ser aceite.
    [0, 4, -3, 5].forEach((c) => {
      result = gate.push(atCents(110, c));
    });
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!, 110))).toBeLessThan(10);
  });

  it('ignora um pico isolado no meio de leituras estáveis', () => {
    const gate = createStabilityGate();
    gate.push(110);
    gate.push(110);
    gate.push(147); // pico a ~500 cents: fica pendente, não limpa o histórico
    gate.push(110);
    gate.push(110);
    const result = gate.push(110);
    expect(result).not.toBeNull();
    // O pico não pode puxar o valor apresentado.
    expect(Math.abs(centsBetween(result!, 110))).toBeLessThan(5);
  });

  it('não perde a fixação por causa de um pico ocasional', () => {
    // Cenário do acampamento: ruído esporádico durante uma corda a soar.
    const gate = createStabilityGate();
    [110, 110, 110, 110].forEach((f) => gate.push(f));
    gate.push(300); // pico
    const result = gate.push(110);
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!, 110))).toBeLessThan(5);
  });
});

describe('createStabilityGate — fala', () => {
  it('rejeita alturas sempre a mudar, como numa frase falada', () => {
    const gate = createStabilityGate();
    // A entoação da fala desloca-se continuamente; nunca há acordo.
    const fala = [104, 128, 96, 155, 118, 88, 140, 112];
    const resultados = fala.map((f) => gate.push(f));
    expect(resultados.every((r) => r === null)).toBe(true);
  });

  it('rejeita uma vogal curta seguida de mudança de altura', () => {
    const gate = createStabilityGate();
    // Duas leituras iguais (vogal breve) não bastam.
    expect(gate.push(120)).toBeNull();
    expect(gate.push(120)).toBeNull();
    expect(gate.push(160)).toBeNull();
    expect(gate.push(95)).toBeNull();
  });

  it('larga a nota quando a mudança de altura se confirma', () => {
    const gate = createStabilityGate();
    [110, 110, 110, 110].forEach((f) => gate.push(f));
    // A corda deixa de soar e fica só fala: as primeiras leituras
    // discrepantes ainda seguram a nota, mas ao confirmarem-se solta-a.
    gate.push(220);
    gate.push(180);
    expect(gate.push(200)).toBeNull();
  });
});

describe('createStabilityGate — histerese', () => {
  // Cenário relatado no dispositivo: falar ao pé do microfone enquanto a
  // corda soa fazia o mostrador alternar entre as duas alturas.
  function lockOnto(gate: ReturnType<typeof createStabilityGate>, hz: number) {
    let last: number | null = null;
    for (let i = 0; i < 4; i++) last = gate.push(hz);
    return last;
  }

  it('mantém a nota da corda durante uma interrupção curta', () => {
    const gate = createStabilityGate();
    expect(lockOnto(gate, 110)).toBeCloseTo(110, 5);

    // Uma sílaba solta a 220 Hz não pode roubar o mostrador.
    expect(gate.push(220)).toBeCloseTo(110, 5);
    expect(gate.push(110)).toBeCloseTo(110, 5);
  });

  it('exige mais confirmações para largar uma nota do que para adquirir uma', () => {
    const semLock = createStabilityGate();
    semLock.push(110);
    // Sem nota fixada bastam 2 leituras discrepantes para recomeçar.
    semLock.push(220);
    expect(semLock.push(220)).toBeNull();

    const comLock = createStabilityGate();
    lockOnto(comLock, 110);
    // Com nota fixada, 2 não chegam — continua a mostrar a corda.
    comLock.push(220);
    expect(comLock.push(220)).toBeCloseTo(110, 5);
  });

  it('acaba por trocar quando a nova nota se mantém', () => {
    const gate = createStabilityGate();
    lockOnto(gate, 110);
    // O utilizador passa mesmo a tocar outra corda: tem de acompanhar.
    for (let i = 0; i < 3; i++) gate.push(220);
    expect(lockOnto(gate, 220)).toBeCloseTo(220, 5);
  });

  it('não segura a nota indefinidamente com leituras discrepantes', () => {
    const gate = createStabilityGate();
    lockOnto(gate, 110);
    // A retenção é limitada pelas confirmações; não pode ficar presa.
    const resultados = [220, 220, 220, 220, 220].map((f) => gate.push(f));
    expect(resultados).toContain(null);
  });
});

describe('createStabilityGate — troca de nota', () => {
  it('recomeça quando há um salto grande, sem misturar as duas notas', () => {
    const gate = createStabilityGate();
    [110, 110, 110, 110].forEach((f) => gate.push(f));

    // Salto acima de resetCents, sustentado: acaba por trocar de nota, e o
    // valor final é a nota nova — nunca algo a meio caminho entre as duas.
    let result: number | null = null;
    for (let i = 0; i < 7; i++) result = gate.push(220);
    expect(result).toBeCloseTo(220, 5);
  });

  it('reset limpa o histórico', () => {
    const gate = createStabilityGate();
    [110, 110, 110].forEach((f) => gate.push(f));
    gate.reset();
    expect(gate.push(110)).toBeNull();
  });
});

describe('createStabilityGate — entradas inválidas', () => {
  it('ignora valores não finitos', () => {
    const gate = createStabilityGate();
    expect(gate.push(NaN)).toBeNull();
    expect(gate.push(Infinity)).toBeNull();
    expect(gate.push(0)).toBeNull();
    expect(gate.push(-110)).toBeNull();
  });

  it('não deixa entradas inválidas contaminar o histórico', () => {
    const gate = createStabilityGate();
    gate.push(110);
    gate.push(NaN);
    gate.push(110);
    gate.push(110);
    expect(gate.push(110)).toBeCloseTo(110, 5);
  });
});

describe('parâmetros por omissão', () => {
  it('exige mais de um terço de segundo de altura estável', () => {
    // Com ticks de 80 ms, 4 leituras concordantes ≈ 320 ms. Uma sílaba
    // raramente sustenta a mesma altura tanto tempo; uma corda sim.
    expect(DEFAULT_STABILITY.requiredAgreeing).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_STABILITY.historySize).toBeGreaterThanOrEqual(
      DEFAULT_STABILITY.requiredAgreeing,
    );
  });
});
