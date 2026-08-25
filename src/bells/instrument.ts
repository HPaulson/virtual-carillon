import { midiToPitch, pitchFrequency, pitchToMidi } from '../melodies/types.js';
import { BellDefinition, BellInstrument, BellPartial } from './types.js';

/**
 * A large concert carillon. C1–E7 is 77 chromatic bells, close to the size of
 * the largest real instruments while still being practical for a local renderer.
 * The registry is deliberately note-addressable: a C4 event always resolves to
 * the C4 bell and never to a generic sample pitch-shifted over the whole range.
 */
export const CARILLON_BELLS: BellDefinition[] = Array.from({ length: 77 }, (_, index) =>
  createBell(24 + index),
);
export const CARILLON_RANGE = {
  lowestMidi: 24,
  highestMidi: 100,
  lowest: 'C1',
  highest: 'E7',
  count: CARILLON_BELLS.length,
} as const;

const byPitch = new Map(CARILLON_BELLS.map((bell) => [bell.pitch, bell]));
const byId = new Map(CARILLON_BELLS.map((bell) => [bell.id, bell]));

export function getCarillonBell(pitchOrId: string): BellDefinition | undefined {
  return byPitch.get(pitchOrId) ?? byId.get(pitchOrId);
}

export function bellForPitch(pitch: string): BellDefinition {
  const bell = byPitch.get(pitch);
  if (!bell)
    throw new Error(
      `Pitch ${pitch} is outside the ${CARILLON_RANGE.lowest}–${CARILLON_RANGE.highest} carillon range`,
    );
  return bell;
}

export function nearestCarillonBell(pitch: string): BellDefinition {
  const midi = pitchToMidi(pitch);
  return CARILLON_BELLS.reduce((closest, bell) =>
    Math.abs(pitchToMidi(bell.pitch) - midi) < Math.abs(pitchToMidi(closest.pitch) - midi)
      ? bell
      : closest,
  );
}

function createBell(midi: number): BellDefinition {
  const pitch = midiToPitch(midi);
  const frequency = pitchFrequency(pitch);
  const size = clamp((100 - midi) / 76, 0.06, 1);
  const variation = seeded(midi * 19 + 7);
  const low = midi <= 48;
  const instrument: BellInstrument = low ? 'tower-bell' : midi < 60 ? 'carillon' : 'carillon';
  const tailSeconds = 1.3 + 13 * Math.pow(size, 1.25);
  const baseDecay = tailSeconds / 3.4;
  const partials: BellPartial[] = [
    partial(0.48, 0.25 + size * 0.18, baseDecay * 0.92, variation),
    partial(1, 0.78 + size * 0.15, baseDecay, variation + 0.1),
    partial(
      1.19 + (variation - 0.5) * 0.025,
      0.32 + size * 0.18,
      baseDecay * 0.76,
      variation + 0.2,
    ),
    partial(1.49 + (variation - 0.5) * 0.032, 0.22 + size * 0.13, baseDecay * 0.6, variation + 0.3),
    partial(1.99 + (variation - 0.5) * 0.04, 0.16 + size * 0.1, baseDecay * 0.45, variation + 0.4),
    partial(2.69 + (variation - 0.5) * 0.07, 0.1 + size * 0.08, baseDecay * 0.29, variation + 0.5),
    partial(
      4.03 + (variation - 0.5) * 0.11,
      0.055 + size * 0.055,
      baseDecay * 0.17,
      variation + 0.6,
    ),
    partial(
      5.38 + (variation - 0.5) * 0.14,
      0.028 + size * 0.035,
      baseDecay * 0.11,
      variation + 0.7,
    ),
    partial(
      7.18 + (variation - 0.5) * 0.18,
      0.014 + size * 0.02,
      baseDecay * 0.07,
      variation + 0.8,
    ),
  ];
  return {
    id: `carillon-${pitch.toLowerCase().replace('#', 's')}`,
    pitch,
    frequency,
    instrument,
    size,
    loudness: 0.48 + size * 0.57,
    attack: 0.004 + size * 0.027,
    tailSeconds,
    stereo: 0.04 + size * 0.14,
    partials,
  };
}

function partial(ratio: number, amplitude: number, decay: number, seed: number): BellPartial {
  return {
    ratio,
    amplitude,
    decay,
    detune: 0.045 + seeded(seed * 3.1) * 0.08,
    phase: seeded(seed * 5.7) * Math.PI * 2,
    beating: 0.0007 + seeded(seed * 7.2) * 0.0025,
  };
}

function seeded(value: number): number {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
