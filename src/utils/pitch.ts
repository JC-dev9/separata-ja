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
