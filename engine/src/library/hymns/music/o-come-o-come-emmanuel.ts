import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const oComeOComeEmmanuel = defineHymn({
  id: 'o-come-o-come-emmanuel',
  name: 'O Come, O Come, Emmanuel (VENI EMMANUEL)',
  liturgical: {
    categories: ['christological'],
    seasons: ['Advent'],
    offices: [],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'Em',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('E4', 'quarter')],
    measures: [
      measure([
        note('G4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('G4', 'dotted-half'), note('A4', 'quarter')]),
      measure([
        note('B4', 'quarter'),
        note('G4', 'quarter'),
        note('E4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('F#4', 'quarter'),
        note('E4', 'quarter'),
        note('D4', 'quarter'),
      ]),
      measure([note('E4', 'dotted-half'), note('A4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('E4', 'quarter'),
        note('E4', 'quarter'),
        note('F#4', 'quarter'),
      ]),
      measure([note('G4', 'half'), note('F#4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'dotted-half'), note('G4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('G4', 'dotted-half'), note('D5', 'quarter')]),
      measure([note('D5', 'dotted-half'), note('B4', 'quarter')]),
      measure([note('B4', 'dotted-half'), note('B4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('G4', 'dotted-half'), note('A4', 'quarter')]),
      measure([
        note('B4', 'quarter'),
        note('G4', 'quarter'),
        note('E4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('F#4', 'quarter'),
        note('E4', 'quarter'),
        note('D4', 'quarter'),
      ]),
      measure([note('E4', 'dotted-half')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'E3' },
});
