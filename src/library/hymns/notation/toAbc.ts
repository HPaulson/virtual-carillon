import {
  durationBeats,
  type ChordEvent,
  type Duration,
  type HymnNotation,
  type MusicEvent,
  type NoteEvent,
} from './types.js';

export interface NotationToAbcOptions {
  id?: string;
  title?: string;
}

const UNIT_FRACTIONS = {
  sixteenth: [1, 16],
  eighth: [1, 8],
  quarter: [1, 4],
  half: [1, 2],
  whole: [1, 1],
} as const;

const MAJOR_KEY_ACCIDENTALS: Record<string, Record<string, string>> = {
  C: {},
  G: { F: '#' },
  D: { F: '#', C: '#' },
  A: { F: '#', C: '#', G: '#' },
  E: { F: '#', C: '#', G: '#', D: '#' },
  B: { F: '#', C: '#', G: '#', D: '#', A: '#' },
  F: { B: 'b' },
  Bb: { B: 'b', E: 'b' },
  Eb: { B: 'b', E: 'b', A: 'b' },
  Ab: { B: 'b', E: 'b', A: 'b', D: 'b' },
};

export function notationToAbc(notation: HymnNotation, options: NotationToAbcOptions = {}): string {
  const title = options.title ?? options.id ?? 'Hymn';
  const [unitNumerator, unitDenominator] = UNIT_FRACTIONS[notation.unitLength];
  const lines = [
    `X:${options.id ?? 1}`,
    `T:${title}`,
    `M:${notation.meter.numerator}/${notation.meter.denominator}`,
    `L:${unitNumerator}/${unitDenominator}`,
    ...(notation.tempo === undefined ? [] : [`Q:${notation.tempo}`]),
    `K:${notation.key}`,
  ];
  const body: string[] = [];
  if (notation.pickup?.length)
    body.push(notation.pickup.map((event) => eventToAbc(event, notation)).join(' '), '|');
  for (const [sectionIndex, hymnSection] of notation.sections.entries()) {
    if (hymnSection.repeat && hymnSection.repeat !== 1) {
      if (hymnSection.repeat !== 2)
        throw new Error(`Only two-pass repeats are supported: ${hymnSection.repeat}`);
      body.push('|:');
    }
    for (const [measureIndex, hymnMeasure] of hymnSection.measures.entries()) {
      body.push(hymnMeasure.events.map((event) => eventToAbc(event, notation)).join(' '));
      if (
        measureIndex < hymnSection.measures.length - 1 ||
        sectionIndex < notation.sections.length - 1 ||
        hymnSection.repeat === 2
      )
        body.push('|');
    }
    if (hymnSection.repeat === 2) body.push(':|');
  }
  return `${lines.join('\n')}\n${body.join(' ').replace(/\s+/g, ' ').trim()}`;
}

function eventToAbc(event: MusicEvent, notation: HymnNotation): string {
  if (event.type === 'rest') return `z${durationSuffix(event.duration, notation)}`;
  if (event.type === 'chord')
    return `[${event.pitches.map((pitch) => pitchToAbc(pitch, notation.key)).join('')}]${durationSuffix(event.duration, notation)}`;
  return `${pitchToAbc(event.pitch, notation.key)}${durationSuffix(event.duration, notation)}${event.tie === 'start' || event.tie === 'continue' ? '-' : ''}`;
}

function durationSuffix(duration: Duration, notation: HymnNotation): string {
  const [unitNumerator, unitDenominator] = UNIT_FRACTIONS[notation.unitLength];
  const unitBeats = (unitNumerator / unitDenominator) * 4;
  const units = durationBeats(duration) / unitBeats;
  if (!Number.isInteger(units) || units <= 0)
    throw new Error(
      `Duration ${durationBeats(duration)} cannot be represented with L:${unitNumerator}/${unitDenominator}`,
    );
  return units === 1 ? '' : String(units);
}

function pitchToAbc(pitch: string, key: string): string {
  const match = pitch.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid notation pitch: ${pitch}`);
  const [, letter, accidental, octaveText] = match;
  const octave = Number(octaveText);
  const expected = keyAccidentals(key)[letter] ?? '';
  const accidentalToken =
    accidental === expected ? '' : accidental === '' ? '=' : accidental === '#' ? '^' : '_';
  const abcLetter = octave >= 5 ? letter.toLowerCase() : letter;
  const referenceOctave = octave >= 5 ? 5 : 4;
  const marks =
    octave > referenceOctave
      ? "'".repeat(octave - referenceOctave)
      : ','.repeat(referenceOctave - octave);
  return `${accidentalToken}${abcLetter}${marks}`;
}

function keyAccidentals(key: string): Record<string, string> {
  const match = key.match(/^([A-Ga-g](?:#|b)?)/);
  const normalized = match ? match[1][0].toUpperCase() + match[1].slice(1) : 'C';
  const minor = /(?:m|min|minor)$/.test(key);
  if (!minor) return MAJOR_KEY_ACCIDENTALS[normalized] ?? {};
  const relativeMajor: Record<string, string> = {
    A: 'C',
    E: 'G',
    B: 'D',
    'F#': 'A',
    'C#': 'E',
    D: 'F',
    G: 'Bb',
    C: 'Eb',
    F: 'Ab',
  };
  return MAJOR_KEY_ACCIDENTALS[relativeMajor[normalized] ?? normalized] ?? {};
}

export function notationEvents(notation: HymnNotation): MusicEvent[] {
  const events = [...(notation.pickup ?? [])];
  for (const hymnSection of notation.sections) {
    const sectionEvents = hymnSection.measures.flatMap((hymnMeasure) => hymnMeasure.events);
    for (let pass = 0; pass < (hymnSection.repeat ?? 1); pass++) events.push(...sectionEvents);
  }
  return events;
}

export function notationPhraseBeats(notation: HymnNotation): number[] {
  let cursor = notation.pickup?.reduce((sum, event) => sum + durationBeats(event.duration), 0) ?? 0;
  const phrases: number[] = [];
  for (const hymnSection of notation.sections) {
    const repeat = hymnSection.repeat ?? 1;
    for (let pass = 0; pass < repeat; pass++) {
      for (const hymnMeasure of hymnSection.measures) {
        cursor += hymnMeasure.events.reduce((sum, event) => sum + durationBeats(event.duration), 0);
        if (hymnMeasure.phraseEnd) phrases.push(cursor);
      }
    }
  }
  return phrases;
}

export function eventPitches(event: MusicEvent): string[] {
  if (event.type === 'note') return [event.pitch];
  if (event.type === 'chord') return event.pitches;
  return [];
}

export type { ChordEvent, NoteEvent };
