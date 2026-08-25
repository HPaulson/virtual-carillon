import type { TimeSignature } from '../../../melodies/types.js';

export type Key = string;
export type UnitLength = 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';

export type NoteDuration =
  | 'sixteenth'
  | 'dotted-sixteenth'
  | 'eighth'
  | 'dotted-eighth'
  | 'quarter'
  | 'dotted-quarter'
  | 'half'
  | 'dotted-half'
  | 'whole'
  | 'dotted-whole'
  | 'double-whole';

export interface BeatDuration {
  beats: number;
}

export type Duration = NoteDuration | BeatDuration;
export type Tie = 'start' | 'stop' | 'continue';

export interface NoteEvent {
  type: 'note';
  pitch: string;
  duration: Duration;
  tie?: Tie;
}

export interface RestEvent {
  type: 'rest';
  duration: Duration;
}

export interface ChordEvent {
  type: 'chord';
  pitches: string[];
  duration: Duration;
}

export type MusicEvent = NoteEvent | RestEvent | ChordEvent;

export interface Measure {
  events: MusicEvent[];
  /** A phrase boundary used by the arranger, independent of a bar line. */
  phraseEnd?: boolean;
}

export interface HymnSection {
  id?: string;
  /** A repeat count of two is emitted using ABC repeat markers. */
  repeat?: number;
  measures: Measure[];
}

export interface HymnNotation {
  meter: TimeSignature;
  unitLength: UnitLength;
  key: Key;
  tempo?: number;
  pickup?: MusicEvent[];
  mode?: number;
  rhythmicCharacter?: 'metered' | 'free';
  sections: HymnSection[];
}

const DURATION_BEATS: Record<NoteDuration, number> = {
  sixteenth: 0.25,
  'dotted-sixteenth': 0.375,
  eighth: 0.5,
  'dotted-eighth': 0.75,
  quarter: 1,
  'dotted-quarter': 1.5,
  half: 2,
  'dotted-half': 3,
  whole: 4,
  'dotted-whole': 6,
  'double-whole': 8,
};

export function durationBeats(duration: Duration): number {
  return typeof duration === 'string' ? DURATION_BEATS[duration] : duration.beats;
}

export function beats(value: number): BeatDuration {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid duration: ${value}`);
  return { beats: value };
}

export function note(pitch: string, duration: Duration, tie?: Tie): NoteEvent {
  return { type: 'note', pitch, duration, ...(tie ? { tie } : {}) };
}

export function rest(duration: Duration): RestEvent {
  return { type: 'rest', duration };
}

export function chord(pitches: string[], duration: Duration): ChordEvent {
  if (pitches.length < 2) throw new Error('A chord must contain at least two pitches');
  return { type: 'chord', pitches, duration };
}

export function measure(events: MusicEvent[], phraseEnd = false): Measure {
  return { events, ...(phraseEnd ? { phraseEnd: true } : {}) };
}

export function section(
  measures: Measure[],
  options: Omit<HymnSection, 'measures'> = {},
): HymnSection {
  return { ...options, measures };
}

export function melody(
  input: Omit<HymnNotation, 'sections'> & { sections?: HymnSection[]; measures?: Measure[] },
): HymnNotation {
  const { measures, sections, ...notation } = input;
  return {
    ...notation,
    sections: sections ?? [{ measures: measures ?? [] }],
  };
}
