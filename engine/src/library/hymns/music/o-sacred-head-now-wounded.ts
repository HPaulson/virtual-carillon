import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const oSacredHeadNowWounded = defineHymn({
  id: 'o-sacred-head-now-wounded',
  name: 'O Sacred Head, Now Wounded (PASSION CHORALE)',
  liturgical: {
    categories: ['passion'],
    seasons: ['Lent', 'Holy Week'],
    offices: [],
    feasts: ['good-friday'],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'Am',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('E4', 'quarter')],
    measures: [
      measure([
        note('A4', 'quarter'),
        note('G4', 'quarter'),
        note('F4', 'quarter'),
        note('E4', 'quarter'),
      ]),
      measure([note('D4', 'half'), note('E4', 'quarter'), note('B4', 'quarter')]),
      measure([
        note('C5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'eighth'),
        note('A4', 'eighth'),
        note('B4', 'quarter'),
      ]),
      measure([note('A4', 'dotted-half'), note('C5', 'quarter')]),
      measure([
        note('B4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([note('C5', 'half'), note('C5', 'quarter'), note('G4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('G4', 'quarter'),
        note('F4', 'quarter'),
        note('F4', 'quarter'),
      ]),
      measure([note('E4', 'dotted-half'), note('C5', 'quarter')]),
      measure([
        note('B4', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([note('A4', 'half'), note('B4', 'quarter'), note('E4', 'quarter')]),
      measure([
        note('F4', 'quarter'),
        note('E4', 'quarter'),
        note('D4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('E4', 'dotted-half')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'A3' },
});
