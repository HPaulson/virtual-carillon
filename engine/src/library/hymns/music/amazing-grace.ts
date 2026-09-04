import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, rest } from '../notation/index.js';

export const amazingGrace = defineHymn({
  id: 'amazing-grace',
  name: 'Amazing Grace (NEW BRITAIN)',
  liturgical: {
    categories: ['christological'],
    seasons: ['General', 'Ordinary Time'],
    offices: [],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 3, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 80,
    rhythmicCharacter: 'metered',
    pickup: [note('D4', 'quarter')],
    measures: [
      measure([note('G4', 'half'), note('B4', 'eighth'), note('G4', 'eighth')]),
      measure([note('B4', 'half'), note('A4', 'quarter')]),
      measure([note('G4', 'quarter'), note('E4', 'quarter'), note('D4', 'half')]),
      measure([note('D4', 'quarter'), note('G4', 'half')]),
      measure([
        note('B4', 'eighth'),
        note('G4', 'eighth'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('D5', 'dotted-half')]),
      measure([note('D5', 'quarter'), rest('quarter'), note('B4', 'quarter')]),
      measure([
        note('D5', 'dotted-quarter'),
        note('B4', 'eighth'),
        note('D5', 'eighth'),
        note('B4', 'eighth'),
      ]),
      measure([note('G4', 'half'), note('D4', 'quarter')]),
      measure([
        note('E4', 'dotted-quarter'),
        note('G4', 'eighth'),
        note('G4', 'eighth'),
        note('E4', 'eighth'),
      ]),
      measure([note('D4', 'half'), note('D4', 'quarter')]),
      measure([note('G4', 'half'), note('B4', 'eighth'), note('G4', 'eighth')]),
      measure([note('B4', 'quarter'), note('A4', 'quarter'), note('G4', 'dotted-half')]),
      measure([note('G4', 'quarter'), rest('quarter')]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'G3' },
});
