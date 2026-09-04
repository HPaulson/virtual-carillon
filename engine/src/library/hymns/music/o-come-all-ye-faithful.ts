import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, rest } from '../notation/index.js';

export const oComeAllYeFaithful = defineHymn({
  id: 'o-come-all-ye-faithful',
  name: 'O Come, All Ye Faithful (ADESTE FIDELES)',
  liturgical: {
    categories: ['christological'],
    seasons: ['Christmas', 'Epiphany'],
    offices: [],
    feasts: ['nativity-of-the-lord', 'epiphany-of-the-lord'],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('G4', 'quarter')],
    measures: [
      measure([note('G4', 'half'), note('D4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('D4', 'half')]),
      measure([
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('B4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('G4', 'half'), note('F#4', 'quarter'), note('E4', 'quarter')]),
      measure([
        note('F#4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([note('F#4', 'half'), note('E4', 'quarter'), note('D4', 'quarter')]),
      measure([note('D4', 'dotted-half'), rest('quarter')]),
      measure([note('D5', 'half'), note('C5', 'quarter'), note('B4', 'quarter')]),
      measure([note('C5', 'half'), note('B4', 'half')]),
      measure([
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('F#4', 'quarter'),
        note('E4', 'quarter'),
        note('D4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('F#4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('G4', 'half'), note('D4', 'quarter'), note('B4', 'quarter')]),
      measure([
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('B4', 'half'), note('A4', 'quarter'), note('B4', 'quarter')]),
      measure([
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('F#4', 'half'), note('G4', 'quarter'), note('C5', 'quarter')]),
      measure([note('B4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('G4', 'dotted-half'), rest('quarter')]),
    ],
  }),
  arrangement: { style: 'celebratory', tonic: 'G3' },
});
