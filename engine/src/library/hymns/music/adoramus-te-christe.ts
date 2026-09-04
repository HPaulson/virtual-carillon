import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const adoramusTeChriste = defineHymn({
  id: 'adoramus-te-christe',
  name: 'Adoramus te, Christe',
  liturgical: {
    categories: ['passion', 'christological'],
    seasons: ['Lent'],
    offices: [],
    feasts: ['good-friday', 'exaltation-of-the-holy-cross'],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 92,
    mode: 1,
    rhythmicCharacter: 'free',
    measures: [
      measure([
        note('C4', 'quarter'),
        note('D4', 'quarter'),
        note('B4', 'eighth'),
        note('D4', 'eighth'),
        note('A5', 'eighth'),
        note('B4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('A5', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('G4', 'eighth'),
        note('A4', 'eighth'),
        note('B4', 'eighth'),
        note('A4', 'eighth'),
        note('G5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('F5', 'quarter'),
        note('G4', 'quarter'),
        note('A5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('F4', 'eighth'),
        note('E4', 'quarter'),
        note('F4', 'eighth'),
        note('G4', 'quarter'),
        note('D4', 'half'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('E5', 'quarter'),
        note('G4', 'quarter'),
        note('G4', 'eighth'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('F4', 'eighth'),
        note('G4', 'quarter'),
        note('F4', 'half'),
      ]),
      measure([
        note('E5', 'quarter'),
        note('F4', 'quarter'),
        note('G4', 'quarter'),
        note('F4', 'eighth'),
        note('E4', 'quarter'),
      ]),
      measure([note('D4', 'half'), note('D4', 'half')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'C3' },
});
