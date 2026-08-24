import type { LiturgicalTags } from '../liturgical/taxonomy.js';

export type Pitch = string;

/** A compact note used by the backwards-compatible melody API. */
export interface Note {
  pitch: Pitch;
  duration: number;
  velocity?: number;
  beat?: number;
  voice?: string;
  lyric?: string;
  tie?: 'start' | 'stop' | 'continue';
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

/** A normalized, beat-based musical event. Rests are represented by gaps. */
export interface ScoreNote {
  pitch: Pitch;
  startBeat: number;
  durationBeats: number;
  velocity: number;
  voice: string;
  lyric?: string;
  tieStart?: boolean;
  tieStop?: boolean;
}

export type ArrangementStyle =
  'grand' | 'chorale' | 'flowing' | 'contemplative' | 'solemn' | 'celebratory';

/** A source-key chord plan used by the carillon arranger. Roots are full pitches
 * so the whole plan follows the melody when a piece is transposed. */
export interface ChordChange {
  root: Pitch;
  quality: 'major' | 'minor' | 'dominant' | 'sus4' | 'diminished';
  startBeat: number;
  durationBeats: number;
  /** Optional analysis metadata. Explicit plans may omit these fields. */
  romanNumeral?: string;
  degree?: number;
  inversion?: 0 | 1 | 2 | 3;
}

export interface ArrangementPlan {
  style: ArrangementStyle;
  /** Optional source-key tonic used when a melody begins with a pickup note. */
  tonic?: Pitch;
  chords?: ChordChange[];
  /** Optional phrase-end beats where the carillonneur may broaden the cadence. */
  cadences?: number[];
}

export interface ScoreProvenance {
  source: string;
  sourceUrl?: string;
  license: string;
  notationFormat: 'abc' | 'gabc' | 'midi' | 'musicxml' | 'transcription';
  authorship?: string;
  edition?: string;
}

export interface Score {
  id: string;
  name: string;
  tempoBpm: number;
  meter: TimeSignature;
  ppq: number;
  events: ScoreNote[];
  mode?: number;
  rhythmicCharacter?: 'metered' | 'free';
  arrangement?: ArrangementPlan;
  score?: Score;
  phrases?: number[];
  provenance?: ScoreProvenance;
}

export interface Melody {
  id: string;
  name: string;
  bpm: number;
  notes: Note[];
  source?: string;
  sourceUrl?: string;
  license?: string;
  notationFormat?: 'abc' | 'gabc' | 'midi' | 'musicxml' | 'transcription';
  notation?: string;
  tags?: string[];
  liturgicalSeasons?: string[];
  feastTypes?: string[];
  officeUsage?: string[];
  liturgicalTags?: LiturgicalTags;
  meter?: TimeSignature;
  mode?: number;
  rhythmicCharacter?: 'metered' | 'free';
  arrangement?: ArrangementPlan;
  score?: Score;
}

const PITCHES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function pitchToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G](?:#|b)?)(-?\d+)$/);
  if (!match || PITCHES[match[1]] === undefined) throw new Error(`Invalid pitch: ${pitch}`);
  return (Number(match[2]) + 1) * 12 + PITCHES[match[1]];
}

export function midiToPitch(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 127)
    throw new Error(`Invalid MIDI pitch: ${value}`);
  return `${PITCH_NAMES[value % 12]}${Math.floor(value / 12) - 1}`;
}

export function transposePitch(pitch: string, semitones: number): string {
  return midiToPitch(pitchToMidi(pitch) + semitones);
}

export function pitchFrequency(pitch: string): number {
  return 440 * Math.pow(2, (pitchToMidi(pitch) - 69) / 12);
}

export function scoreFromMelody(melody: Melody): Score {
  if (melody.score) {
    return {
      ...melody.score,
      id: melody.id,
      name: melody.name,
      tempoBpm: melody.bpm,
      arrangement: melody.arrangement ?? melody.score.arrangement,
      provenance:
        melody.score.provenance ??
        (melody.source
          ? {
              source: melody.source,
              sourceUrl: melody.sourceUrl,
              license: melody.license ?? 'Unspecified',
              notationFormat: melody.notationFormat ?? 'transcription',
            }
          : undefined),
    };
  }
  let cursor = 0;
  const events: ScoreNote[] = [];
  for (const note of melody.notes) {
    const startBeat = note.beat ?? cursor;
    if (note.pitch !== 'rest') {
      events.push({
        pitch: note.pitch,
        startBeat,
        durationBeats: Math.max(0.125, note.duration),
        velocity: note.velocity ?? 0.78,
        voice: note.voice ?? 'melody',
        lyric: note.lyric,
        tieStart: note.tie === 'start' || note.tie === 'continue',
        tieStop: note.tie === 'stop' || note.tie === 'continue',
      });
    }
    cursor = Math.max(cursor, startBeat + note.duration);
  }
  return {
    id: melody.id,
    name: melody.name,
    tempoBpm: melody.bpm,
    meter: melody.meter ?? { numerator: 4, denominator: 4 },
    ppq: 480,
    events,
    mode: melody.mode,
    rhythmicCharacter: melody.rhythmicCharacter ?? 'metered',
    arrangement: melody.arrangement,
    provenance: melody.source
      ? {
          source: melody.source,
          sourceUrl: melody.sourceUrl,
          license: melody.license ?? 'Unspecified',
          notationFormat: melody.notationFormat ?? 'transcription',
        }
      : undefined,
  };
}
