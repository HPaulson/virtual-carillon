import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const exsultetOrbisGaudiis = defineHymn({
  id: 'exsultet-orbis-gaudiis',
  name: 'Exsultet Orbis Gaudiis (Hymn for Apostles)',
  liturgical: {
    categories: ['apostles', 'saints', 'praise'],
    seasons: ['General', 'Ordinary Time'],
    offices: ['Lauds'],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 72,
    mode: 8,
    rhythmicCharacter: 'free',
    measures: [
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('C5', 'half')]),
      measure([
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([note('A4', 'half'), note('G4', 'half')]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('C5', 'half')]),
      measure([
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('G4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([
        note('F4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('B4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'quarter'),
        note('D5', 'quarter'),
      ]),
      measure([note('C5', 'half'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('G4', 'half')]),
      measure([
        note('F4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('G4', 'whole')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'G3' },
});
