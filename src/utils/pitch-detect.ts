export interface YinOptions {
  /** Menor período (em amostras) a considerar — define a frequência máxima. */
  minLag: number;
  /** Maior período (em amostras) a considerar — define a frequência mínima. */
  maxLag: number;
  /** Limiar absoluto do YIN. Abaixo disto o período é aceite. */
  threshold: number;
  /** Abaixo deste RMS considera-se silêncio e nem se corre o algoritmo. */
  rmsThreshold: number;
}

export interface YinResult {
  frequency: number;
  /** 0..1 — quão periódico é o sinal. Serve de porta contra ruído. */
  confidence: number;
  rms: number;
}

export type DetectPitchYin = (
  buffer: Float32Array,
  sampleRate: number,
  options: YinOptions,
) => YinResult | null;

/**
 * Deteção de pitch pelo método YIN (de Cheveigné & Kawahara, 2002), em texto.
 *
 * Ao contrário da autocorrelação simples — que devolve sempre *alguma*
 * frequência, mesmo para ruído — o YIN mede quão periódico é o sinal e
 * devolve `null` quando não encontra periodicidade credível. É essa porta que
 * impede vozes, vento ou ruído de ambiente de aparecerem como notas.
 *
 * ## Porque é que isto é uma string e não uma função
 *
 * O algoritmo corre dentro do WebView do afinador (o microfone é capturado por
 * Web Audio), por isso tem de lá chegar como texto.
 *
 * A via óbvia — declarar uma função normal e injetá-la com `.toString()` — **não
 * funciona no React Native**: o Hermes compila as funções para bytecode e
 * descarta o código-fonte, portanto `toString()` devolve
 * `function detectPitchYin() { [bytecode] }`. Injetado no WebView, o `[bytecode]`
 * é interpretado como um array com a variável `bytecode` e rebenta com
 * "bytecode is not defined". Em Jest isso não aparece, porque o Node (V8) retém
 * o código-fonte — foi preciso um teste no dispositivo para descobrir.
 *
 * Manter o algoritmo aqui em texto dá uma única fonte de verdade: é este mesmo
 * texto que é injetado no WebView e que os testes materializam com
 * `new Function` (ver `__tests__/pitch-detect.test.ts`).
 *
 * Escrito em ES5 (`var`, funções normais) para correr em qualquer versão do
 * System WebView. Não usar crases nem `${` — o texto é interpolado num template.
 */
export const YIN_SOURCE = `function detectPitchYin(buffer, sampleRate, options) {
  var size = buffer.length;
  var minLag = Math.max(2, Math.floor(options.minLag));
  var maxLag = Math.min(Math.floor(options.maxLag), Math.floor(size / 2));
  if (maxLag <= minLag) return null;

  // Porta de volume: sem energia suficiente nem vale a pena procurar.
  var sumSquares = 0;
  for (var i = 0; i < size; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  var rms = Math.sqrt(sumSquares / size);
  if (rms < options.rmsThreshold) return null;

  // Passo 1 - funcao de diferenca d(tau). A janela de integracao encolhe a
  // medida que tau cresce, como no artigo original.
  var diff = new Float32Array(maxLag + 1);
  var frames = size - maxLag;
  for (var tau = minLag; tau <= maxLag; tau++) {
    var sum = 0;
    for (var j = 0; j < frames; j++) {
      var delta = buffer[j] - buffer[j + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Passo 2 - diferenca media cumulativa normalizada (CMNDF). E esta
  // normalizacao que da uma escala absoluta comparavel com um limiar.
  var cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  var runningSum = 0;
  for (var t2 = minLag; t2 <= maxLag; t2++) {
    runningSum += diff[t2];
    cmnd[t2] = runningSum > 0 ? (diff[t2] * (t2 - minLag + 1)) / runningSum : 1;
  }

  // Passo 3 - limiar absoluto. Procura-se o PRIMEIRO minimo local abaixo do
  // limiar, nao o minimo global: e o que evita os erros de oitava.
  var bestTau = -1;
  for (var t3 = minLag; t3 <= maxLag; t3++) {
    if (cmnd[t3] < options.threshold) {
      var t = t3;
      while (t + 1 <= maxLag && cmnd[t + 1] < cmnd[t]) {
        t++;
      }
      bestTau = t;
      break;
    }
  }

  // Nenhum periodo passou o limiar: o sinal nao e periodico o suficiente.
  if (bestTau === -1) return null;

  var cmndAtBest = cmnd[bestTau];

  // Passo 4 - interpolacao parabolica, para precisao abaixo da amostra.
  var refinedTau = bestTau;
  if (bestTau > minLag && bestTau < maxLag) {
    var prev = cmnd[bestTau - 1];
    var cur = cmnd[bestTau];
    var next = cmnd[bestTau + 1];
    var denom = 2 * (2 * cur - prev - next);
    if (denom !== 0) {
      var shift = (next - prev) / denom;
      if (shift > -1 && shift < 1) {
        refinedTau = bestTau + shift;
      }
    }
  }

  if (refinedTau <= 0) return null;

  var frequency = sampleRate / refinedTau;
  if (!isFinite(frequency) || frequency <= 0) return null;

  return {
    frequency: frequency,
    confidence: Math.max(0, Math.min(1, 1 - cmndAtBest)),
    rms: rms
  };
}`;
