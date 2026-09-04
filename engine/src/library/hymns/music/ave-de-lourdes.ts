import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, rest } from '../notation/index.js';

export const aveDeLourdes = defineHymn({
  id: 'ave-de-lourdes',
  name: 'Ave de Lourdes (Immaculate Mother)',
  liturgical: {
    categories: ['marian', 'praise'],
    seasons: ['General', 'Ordinary Time'],
    offices: [],
    feasts: ['our-lady-of-lourdes'],
  },
  notation: melody({
    meter: { numerator: 3, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('D4', 'quarter')],
    measures: [
      measure([note('G4', 'quarter'), note('G4', 'quarter'), note('B4', 'quarter')]),
      measure([note('G4', 'quarter'), note('G4', 'quarter'), note('B4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([note('G4', 'half'), note('D4', 'quarter')]),
      measure([note('G4', 'quarter'), note('G4', 'quarter'), note('B4', 'quarter')]),
      measure([note('G4', 'quarter'), note('G4', 'quarter'), note('B4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([note('G4', 'half'), rest('quarter')]),
      measure([note('C5', 'half'), note('C5', 'quarter')]),
      measure([note('B4', 'half'), note('B4', 'quarter')]),
      measure([note('A4', 'quarter'), note('A4', 'quarter'), note('A4', 'quarter')]),
      measure([note('D5', 'half'), note('G3', 'quarter')]),
      measure([note('C5', 'half'), note('C5', 'quarter')]),
      measure([note('B4', 'quarter'), note('B4', 'quarter'), note('B4', 'quarter')]),
      measure([note('A4', 'half'), note('B4', 'eighth'), note('A4', 'eighth')]),
      measure([note('G4', 'half')]),
    ],
  }),
  arrangement: { style: 'flowing', tonic: 'G3' },
});
