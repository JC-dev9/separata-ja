const A4_HZ = 440;
const A4_MIDI = 69;
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export type GuitarString = {
  name: string;
  label: string;
  frequency: number;
};

export const STANDARD_GUITAR_TUNING: GuitarString[] = [
  { name: 'E2', label: '6ª · E', frequency: 82.4069 },
  { name: 'A2', label: '5ª · A', frequency: 110.0 },
  { name: 'D3', label: '4ª · D', frequency: 146.832 },
  { name: 'G3', label: '3ª · G', frequency: 195.998 },
  { name: 'B3', label: '2ª · B', frequency: 246.942 },
  { name: 'E4', label: '1ª · E', frequency: 329.628 },
];

// Gama de procura em modo cromático: da 6ª corda com folga até bem acima da 1ª.
// Restringir a procura é a primeira defesa contra ruído de ambiente — o que
// está fora desta janela nunca chega a ser considerado uma nota.
export const GUITAR_MIN_HZ = 65;
export const GUITAR_MAX_HZ = 450;

/** Meio-tons acima e abaixo da corda escolhida no modo "Por corda". */
export const STRING_RANGE_SEMITONES = 6;

/**
 * Janela de frequências onde o detetor deve procurar.
 *
 * Com uma corda escolhida, aperta a janela à volta dela: assim uma voz ou um
 * instrumento noutra oitava não conseguem ser lidos como sendo aquela corda.
 * Sem corda escolhida (modo cromático), usa a gama do violão.
 */
export function searchRangeFor(targetFrequency: number | null | undefined): {
  minHz: number;
  maxHz: number;
} {
  if (targetFrequency == null || !isFinite(targetFrequency) || targetFrequency <= 0) {
    return { minHz: GUITAR_MIN_HZ, maxHz: GUITAR_MAX_HZ };
  }
  return {
    minHz: targetFrequency * Math.pow(2, -STRING_RANGE_SEMITONES / 12),
    maxHz: targetFrequency * Math.pow(2, STRING_RANGE_SEMITONES / 12),
  };
}

export type PitchInfo = {
  frequency: number;
  noteName: string;
  octave: number;
  fullName: string;
  cents: number;
  targetFrequency: number;
  closestString: GuitarString;
  closestStringCents: number;
};

export function frequencyToPitch(frequency: number): PitchInfo {
  const midi = 12 * Math.log2(frequency / A4_HZ) + A4_MIDI;
  const roundedMidi = Math.round(midi);
  const cents = Math.round((midi - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteName = NOTE_NAMES[noteIndex];
  const targetFrequency = A4_HZ * Math.pow(2, (roundedMidi - A4_MIDI) / 12);

  let closestString = STANDARD_GUITAR_TUNING[0];
  let minAbsCents = Infinity;
  let closestStringCents = 0;
  for (const s of STANDARD_GUITAR_TUNING) {
    const c = 1200 * Math.log2(frequency / s.frequency);
    if (Math.abs(c) < minAbsCents) {
      minAbsCents = Math.abs(c);
      closestString = s;
      closestStringCents = Math.round(c);
    }
  }

  return {
    frequency,
    noteName,
    octave,
    fullName: `${noteName}${octave}`,
    cents,
    targetFrequency,
    closestString,
    closestStringCents,
  };
}
