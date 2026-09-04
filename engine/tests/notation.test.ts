import { describe, expect, it } from 'vitest';
import { parseAbc } from '../src/melodies/parsers.js';
import {
  beats,
  chord,
  melody,
  measure,
  note,
  notationToAbc,
  rest,
  section,
} from '../src/library/hymns/notation/index.js';

describe('structured notation serializer', () => {
  it('round-trips pickups, dotted values, rests, accidentals, octave changes, ties, and repeats', () => {
    const notation = melody({
      meter: { numerator: 3, denominator: 4 },
      unitLength: 'sixteenth',
      key: 'Bb',
      tempo: 72,
      pickup: [note('F4', 'eighth')],
      sections: [
        section(
          [
            measure([note('Bb4', 'quarter'), note('B4', 'dotted-eighth'), rest('sixteenth')]),
            measure([note('C5', 'half'), note('D5', 'quarter')]),
          ],
          { id: 'refrain', repeat: 2 },
        ),
        section([
          measure([
            note('C#5', beats(0.75), 'start'),
            note('D5', 'quarter'),
            note('E5', 'quarter'),
          ]),
          measure([chord(['F4', 'A4', 'C5'], 'half'), rest('quarter')]),
        ]),
      ],
    });
    const abc = notationToAbc(notation, { id: 'round-trip', title: 'Round Trip' });
    const parsed = parseAbc(abc, 'round-trip');
    expect(abc).toContain('M:3/4');
    expect(abc).toContain('L:1/16');
    expect(abc).toContain('|:');
    expect(abc).toContain(':|');
    expect(parsed.notes.map(({ pitch, duration }) => ({ pitch, duration }))).toEqual([
      { pitch: 'F4', duration: 0.5 },
      { pitch: 'Bb4', duration: 1 },
      { pitch: 'B4', duration: 0.75 },
      { pitch: 'rest', duration: 0.25 },
      { pitch: 'C5', duration: 2 },
      { pitch: 'D5', duration: 1 },
      { pitch: 'Bb4', duration: 1 },
      { pitch: 'B4', duration: 0.75 },
      { pitch: 'rest', duration: 0.25 },
      { pitch: 'C5', duration: 2 },
      { pitch: 'D5', duration: 1 },
      { pitch: 'C#5', duration: 0.75 },
      { pitch: 'D5', duration: 1 },
      { pitch: 'E5', duration: 1 },
      { pitch: 'F4', duration: 2 },
      { pitch: 'A4', duration: 2 },
      { pitch: 'C5', duration: 2 },
      { pitch: 'rest', duration: 1 },
    ]);
    expect(parsed.notes[11].tie).toBe('start');
    expect(parsed.notes[12].tie).toBe('stop');
  });

  it('retains free-rhythm phrase boundaries and Gregorian mode metadata without GABC output', () => {
    const notation = melody({
      meter: { numerator: 1, denominator: 1 },
      unitLength: 'sixteenth',
      key: 'C',
      mode: 8,
      rhythmicCharacter: 'free',
      sections: [
        section([
          measure([note('A4', 'quarter'), note('G4', 'half')], true),
          measure([note('C5', 'quarter')], true),
        ]),
      ],
    });
    const abc = notationToAbc(notation, { id: 'gregorian-round-trip' });
    expect(abc).not.toContain('%%GABC');
    expect(abc).toContain('M:1/1');
    expect(notation.sections[0].measures.filter((item) => item.phraseEnd)).toHaveLength(2);
  });
});
