import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const psalm51Miserere = defineHymn({
  id: 'psalm-51-miserere',
  name: 'Psalm 51 (Miserere mei, Deus)',
  liturgical: {
    categories: ['penitential', 'psalm'],
    seasons: ['Lent'],
    offices: [],
    feasts: ['ash-wednesday', 'all-souls'],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 92,
    rhythmicCharacter: 'free',
    measures: [
      measure([
        note('F4', 'quarter'),
        note('G4', 'eighth'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('B4', 'eighth'),
        note('B4', 'eighth'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'eighth'),
        note('A4', 'quarter'),
      ]),
      measure([note('A4', 'half'), note('A4', 'quarter'), note('A4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('F4', 'quarter'),
        note('G4', 'eighth'),
        note('A4', 'eighth'),
        note('G4', 'quarter'),
        note('G4', 'eighth'),
        note('F4', 'half'),
      ]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'F3' },
});
