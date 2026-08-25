import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const firstNoel = defineHymn({
  id: 'first-noel',
  name: 'The First Nowell',
  liturgical: {
    categories: ['christological'],
    seasons: ['Christmas', 'Epiphany'],
    offices: [],
    feasts: ['nativity-of-the-lord', 'epiphany-of-the-lord'],
  },
  notation: melody({
    meter: { numerator: 3, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'D',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('F#4', 'eighth'), note('E4', 'eighth')],
    measures: [
      measure([note('D4', 'dotted-quarter'), note('E4', 'quarter'), note('F#4', 'quarter')]),
      measure([note('G4', 'quarter'), note('A4', 'half')]),
      measure([
        note('B4', 'eighth'),
        note('C#5', 'eighth'),
        note('D5', 'quarter'),
        note('C#5', 'quarter'),
      ]),
      measure([note('B4', 'quarter'), note('A4', 'half')]),
      measure([
        note('B4', 'eighth'),
        note('C#5', 'eighth'),
        note('D5', 'quarter'),
        note('C#5', 'quarter'),
      ]),
      measure([note('B4', 'quarter'), note('A4', 'quarter'), note('B4', 'quarter')]),
      measure([note('C#5', 'quarter'), note('D5', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'quarter'), note('F#4', 'half')]),
      measure([
        note('F#4', 'eighth'),
        note('E4', 'eighth'),
        note('D4', 'dotted-quarter'),
        note('E4', 'quarter'),
      ]),
      measure([note('F#4', 'quarter'), note('G4', 'quarter'), note('A4', 'half')]),
      measure([note('D5', 'eighth'), note('C#5', 'eighth'), note('B4', 'half')]),
      measure([note('B4', 'quarter'), note('A4', 'dotted-half')]),
      measure([note('D5', 'quarter'), note('C#5', 'quarter'), note('B4', 'quarter')]),
      measure([note('A4', 'quarter'), note('B4', 'quarter'), note('C#5', 'quarter')]),
      measure([note('D5', 'quarter'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('F#4', 'half')]),
    ],
  }),
  arrangement: { style: 'flowing', tonic: 'D3' },
});
