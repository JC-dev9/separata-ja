import { DetectPitchYin, YIN_SOURCE, YinOptions } from '../pitch-detect';
import { STANDARD_GUITAR_TUNING } from '../pitch';

// O algoritmo vive em texto porque é injetado no WebView (ver pitch-detect.ts).
// Aqui materializamo-lo tal como o WebView faz, para testar exactamente o
// mesmo código que corre em produção.
const detectPitchYin = new Function(`return (${YIN_SOURCE});`)() as DetectPitchYin;

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;

// Gama útil do violão com folga: ~65 Hz a ~450 Hz.
const OPTIONS: YinOptions = {
  minLag: Math.floor(SAMPLE_RATE / 450),
  maxLag: Math.ceil(SAMPLE_RATE / 65),
  threshold: 0.12,
  rmsThreshold: 0.005,
};

function sine(frequency: number, amplitude = 0.5, size = BUFFER_SIZE): Float32Array {
  const buf = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    buf[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }
  return buf;
}

// Timbre mais realista: fundamental + harmónicos decrescentes, como uma corda.
function pluckedString(frequency: number, size = BUFFER_SIZE): Float32Array {
  const buf = new Float32Array(size);
  const harmonics = [1, 0.6, 0.4, 0.25, 0.15, 0.1];
  for (let i = 0; i < size; i++) {
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) {
      v += harmonics[h] * Math.sin((2 * Math.PI * frequency * (h + 1) * i) / SAMPLE_RATE);
    }
    buf[i] = 0.4 * v;
  }
  return buf;
}

// Gerador determinístico, para os testes não ficarem instáveis.
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function whiteNoise(amplitude = 0.5, size = BUFFER_SIZE, seed = 42): Float32Array {
  const rand = makeRandom(seed);
  const buf = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    buf[i] = amplitude * (rand() * 2 - 1);
  }
  return buf;
}

function mix(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
  return out;
}

function centsBetween(actual: number, expected: number): number {
  return 1200 * Math.log2(actual / expected);
}

describe('detectPitchYin — sinais periódicos', () => {
  it.each(STANDARD_GUITAR_TUNING.map((s) => [s.name, s.frequency] as const))(
    'deteta a corda %s (%f Hz) com precisão inferior a 1 cent',
    (_name, frequency) => {
      const result = detectPitchYin(sine(frequency), SAMPLE_RATE, OPTIONS);
      expect(result).not.toBeNull();
      expect(Math.abs(centsBetween(result!.frequency, frequency))).toBeLessThan(1);
    },
  );

  it('reporta confiança alta para um seno puro', () => {
    const result = detectPitchYin(sine(196), SAMPLE_RATE, OPTIONS);
    expect(result!.confidence).toBeGreaterThan(0.9);
  });

  it('não comete erro de oitava com harmónicos', () => {
    // O modo falhado clássico é devolver 2x ou 0.5x a fundamental.
    STANDARD_GUITAR_TUNING.forEach((s) => {
      const result = detectPitchYin(pluckedString(s.frequency), SAMPLE_RATE, OPTIONS);
      expect(result).not.toBeNull();
      expect(Math.abs(centsBetween(result!.frequency, s.frequency))).toBeLessThan(10);
    });
  });

  it('deteta desafinação com resolução suficiente para afinar', () => {
    // 10 cents acima de A2 tem de ser distinguível do valor certo.
    const sharp = 110 * Math.pow(2, 10 / 1200);
    const result = detectPitchYin(sine(sharp), SAMPLE_RATE, OPTIONS);
    expect(centsBetween(result!.frequency, 110)).toBeGreaterThan(8);
    expect(centsBetween(result!.frequency, 110)).toBeLessThan(12);
  });
});

describe('detectPitchYin — rejeição de ruído', () => {
  it('devolve null para ruído branco', () => {
    // Este é o teste central: o algoritmo antigo devolvia aqui uma nota
    // inventada, que é a causa da sensibilidade ao ambiente.
    expect(detectPitchYin(whiteNoise(0.5), SAMPLE_RATE, OPTIONS)).toBeNull();
  });

  it('devolve null para ruído branco com várias sementes', () => {
    for (let seed = 1; seed <= 8; seed++) {
      expect(detectPitchYin(whiteNoise(0.4, BUFFER_SIZE, seed), SAMPLE_RATE, OPTIONS)).toBeNull();
    }
  });

  it('devolve null para silêncio', () => {
    expect(detectPitchYin(new Float32Array(BUFFER_SIZE), SAMPLE_RATE, OPTIONS)).toBeNull();
  });

  it('devolve null para sinal abaixo do limiar de volume', () => {
    expect(detectPitchYin(sine(196, 0.0001), SAMPLE_RATE, OPTIONS)).toBeNull();
  });

  it('ainda deteta a nota com ruído moderado', () => {
    const result = detectPitchYin(mix(sine(196, 0.5), whiteNoise(0.05)), SAMPLE_RATE, OPTIONS);
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.frequency, 196))).toBeLessThan(15);
  });

  it('prefere desistir a inventar quando o ruído domina', () => {
    // Com o sinal soterrado, o resultado aceitável é null ou a nota certa —
    // nunca uma frequência errada com ar de confiante.
    const result = detectPitchYin(mix(sine(196, 0.05), whiteNoise(0.8)), SAMPLE_RATE, OPTIONS);
    if (result !== null) {
      expect(Math.abs(centsBetween(result.frequency, 196))).toBeLessThan(50);
    }
  });

  it('baixa a confiança à medida que o ruído aumenta', () => {
    const limpo = detectPitchYin(sine(196, 0.5), SAMPLE_RATE, OPTIONS);
    const sujo = detectPitchYin(mix(sine(196, 0.5), whiteNoise(0.15)), SAMPLE_RATE, OPTIONS);
    expect(sujo).not.toBeNull();
    expect(sujo!.confidence).toBeLessThan(limpo!.confidence);
  });
});

describe('detectPitchYin — gama restrita', () => {
  // É assim que o modo "Por corda" ignora ruído fora da corda escolhida.
  function rangeAround(frequency: number, semitones: number): YinOptions {
    const low = frequency * Math.pow(2, -semitones / 12);
    const high = frequency * Math.pow(2, semitones / 12);
    return {
      ...OPTIONS,
      minLag: Math.floor(SAMPLE_RATE / high),
      maxLag: Math.ceil(SAMPLE_RATE / low),
    };
  }

  it('deteta a nota dentro da gama pedida', () => {
    const result = detectPitchYin(sine(82.41), SAMPLE_RATE, rangeAround(82.41, 6));
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.frequency, 82.41))).toBeLessThan(1);
  });

  it('ignora um sinal muito acima da gama', () => {
    // A afinar o E2 (82 Hz), uma voz a 300 Hz não pode virar leitura.
    const result = detectPitchYin(sine(300), SAMPLE_RATE, rangeAround(82.41, 6));
    if (result !== null) {
      expect(Math.abs(centsBetween(result.frequency, 300))).toBeGreaterThan(100);
    }
  });

  it('devolve null quando a gama é inválida', () => {
    expect(
      detectPitchYin(sine(196), SAMPLE_RATE, { ...OPTIONS, minLag: 500, maxLag: 100 }),
    ).toBeNull();
  });
});

describe('YIN_SOURCE — injetável no WebView', () => {
  it('não contém bytecode do Hermes', () => {
    // O motivo de o algoritmo estar em texto: com uma função normal, o Hermes
    // devolvia "function detectPitchYin() { [bytecode] }" no toString() e o
    // afinador rebentava no dispositivo com "bytecode is not defined".
    expect(YIN_SOURCE).not.toMatch(/\[bytecode\]/);
  });

  it('não depende de requires nem de helpers do transpilador', () => {
    expect(YIN_SOURCE).not.toMatch(/\brequire\s*\(/);
    expect(YIN_SOURCE).not.toMatch(/\b_interopRequireDefault\b/);
    expect(YIN_SOURCE).not.toMatch(/\bexports\b/);
  });

  it('não referencia identificadores de fora', () => {
    expect(YIN_SOURCE).not.toMatch(/\bSTANDARD_GUITAR_TUNING\b/);
    expect(YIN_SOURCE).not.toMatch(/\bGUITAR_MIN_HZ\b/);
  });

  it('não quebra o template nem o bloco script onde é interpolado', () => {
    expect(YIN_SOURCE).not.toContain('`');
    expect(YIN_SOURCE).not.toContain('${');
    expect(YIN_SOURCE).not.toMatch(/<\/script/i);
  });

  it('é sintaticamente válido e avalia para uma função', () => {
    expect(typeof detectPitchYin).toBe('function');
  });

  it('reproduz o auto-teste que o WebView corre ao arrancar', () => {
    // Mesmos parâmetros que PitchDetectorWebView usa em selfTest().
    const result = detectPitchYin(sine(196, 0.5), 44100, {
      minLag: Math.floor(44100 / 450),
      maxLag: Math.ceil(44100 / 65),
      threshold: 0.12,
      rmsThreshold: 0.008,
    });
    expect(result).not.toBeNull();
    expect(Math.abs(result!.frequency - 196)).toBeLessThan(2);
  });
});
