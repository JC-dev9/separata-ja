import { frequencyToPitch, STANDARD_GUITAR_TUNING } from '../pitch';

describe('STANDARD_GUITAR_TUNING', () => {
  it('tem as seis cordas', () => {
    expect(STANDARD_GUITAR_TUNING).toHaveLength(6);
  });

  it('está ordenada da mais grave para a mais aguda', () => {
    const freqs = STANDARD_GUITAR_TUNING.map((s) => s.frequency);
    expect(freqs).toEqual([...freqs].sort((a, b) => a - b));
  });
});

describe('frequencyToPitch', () => {
  it('identifica o lá de referência (A4 = 440 Hz)', () => {
    const p = frequencyToPitch(440);
    expect(p.noteName).toBe('A');
    expect(p.octave).toBe(4);
    expect(p.fullName).toBe('A4');
    expect(p.cents).toBe(0);
  });

  it('identifica o dó central', () => {
    const p = frequencyToPitch(261.626);
    expect(p.fullName).toBe('C4');
    expect(Math.abs(p.cents)).toBeLessThanOrEqual(1);
  });

  it('reporta desvio positivo acima da nota', () => {
    // ~+50 cents acima de A4.
    const p = frequencyToPitch(440 * Math.pow(2, 40 / 1200));
    expect(p.noteName).toBe('A');
    expect(p.cents).toBeGreaterThan(30);
  });

  it('reporta desvio negativo abaixo da nota', () => {
    const p = frequencyToPitch(440 * Math.pow(2, -40 / 1200));
    expect(p.noteName).toBe('A');
    expect(p.cents).toBeLessThan(-30);
  });

  it('devolve a frequência alvo da nota mais próxima', () => {
    const p = frequencyToPitch(441);
    expect(p.targetFrequency).toBeCloseTo(440, 1);
  });

  it('encontra a corda de violão mais próxima', () => {
    STANDARD_GUITAR_TUNING.forEach((s) => {
      const p = frequencyToPitch(s.frequency);
      expect(p.closestString.name).toBe(s.name);
      expect(Math.abs(p.closestStringCents)).toBeLessThanOrEqual(1);
    });
  });

  it('reporta o desvio face à corda mais próxima', () => {
    const e2 = STANDARD_GUITAR_TUNING[0];
    const p = frequencyToPitch(e2.frequency * Math.pow(2, 20 / 1200));
    expect(p.closestString.name).toBe('E2');
    expect(p.closestStringCents).toBeGreaterThan(15);
  });

  it('mantém as oitavas corretas ao longo do braço', () => {
    expect(frequencyToPitch(82.41).fullName).toBe('E2');
    expect(frequencyToPitch(329.63).fullName).toBe('E4');
  });

  it('preserva a frequência recebida', () => {
    expect(frequencyToPitch(123.45).frequency).toBe(123.45);
  });
});
