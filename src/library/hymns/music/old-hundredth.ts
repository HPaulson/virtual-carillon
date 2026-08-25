import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const oldHundredth = defineHymn({
  id: 'old-hundredth',
  name: 'Old Hundredth',
  liturgical: {
    categories: ['praise'],
    seasons: ['General', 'Ordinary Time'],
    offices: [],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 2, denominator: 2 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 100,
    rhythmicCharacter: 'metered',
    measures: [
      measure([note('G4', 'whole')]),
      measure([note('G4', 'half'), note('F#4', 'half')]),
      measure([note('E4', 'half'), note('D4', 'half')]),
      measure([note('G4', 'half'), note('A4', 'half')]),
      measure([note('B4', 'whole')]),
      measure([note('B4', 'whole')]),
      measure([note('B4', 'half'), note('B4', 'half')]),
      measure([note('A4', 'half'), note('G4', 'half')]),
      measure([note('C5', 'half'), note('B4', 'half')]),
      measure([note('A4', 'whole')]),
      measure([note('G4', 'whole')]),
      measure([note('A4', 'half'), note('B4', 'half')]),
      measure([note('A4', 'half'), note('G4', 'half')]),
      measure([note('E4', 'half'), note('F#4', 'half')]),
      measure([note('G4', 'whole')]),
      measure([note('D5', 'whole')]),
      measure([note('B4', 'half'), note('G4', 'half')]),
      measure([note('A4', 'half'), note('C5', 'half')]),
      measure([note('B4', 'half'), note('A4', 'half')]),
      measure([note('G4', 'whole')]),
    ],
  }),
  arrangement: { style: 'grand', tonic: 'G3' },
});
