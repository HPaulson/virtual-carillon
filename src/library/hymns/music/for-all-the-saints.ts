import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const forAllTheSaints = defineHymn({
  id: 'for-all-the-saints',
  name: 'For All the Saints (SINE NOMINE)',
  liturgical: {
    categories: ['saints'],
    seasons: ['General', 'Ordinary Time'],
    offices: [],
    feasts: ['all-saints'],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 96,
    rhythmicCharacter: 'metered',
    measures: [
      measure([
        note('D4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'half'),
      ]),
      measure([
        note('D4', 'quarter'),
        note('E4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('D4', 'quarter'), note('B4', 'whole')]),
      measure([note('A4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('F#4', 'half'), note('F#4', 'quarter'), note('G4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('F#4', 'quarter'),
        note('E4', 'quarter'),
        note('D4', 'quarter'),
      ]),
      measure([note('G4', 'whole')]),
      measure([note('G4', 'quarter'), note('G4', 'quarter'), note('D5', 'half')]),
      measure([
        note('D5', 'quarter'),
        note('C5', 'eighth'),
        note('B4', 'eighth'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('A4', 'half'), note('D5', 'half')]),
      measure([
        note('E5', 'quarter'),
        note('D5', 'eighth'),
        note('C5', 'eighth'),
        note('D5', 'half'),
      ]),
      measure([note('G4', 'dotted-half'), note('A4', 'quarter')]),
      measure([note('B4', 'quarter'), note('A4', 'quarter'), note('G4', 'half')]),
      measure([note('G4', 'whole')]),
    ],
  }),
  arrangement: { style: 'celebratory', tonic: 'G3' },
});
