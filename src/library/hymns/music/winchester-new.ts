import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const winchesterNew = defineHymn({
  id: 'winchester-new',
  name: 'Winchester New (ON JORDAN’S BANK)',
  source: 'Winchester New, adapted by William H. Havergal; public-domain tune source',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fmirror%2Fwww.stephenmerrony.co.uk%2FWinchester_New_1%2F0000',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  liturgical: {
    categories: ['christological'],
    seasons: ['Advent'],
    offices: [],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'Bb',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('F4', 'quarter')],
    measures: [
      measure([
        note('Bb4', 'quarter'),
        note('F4', 'quarter'),
        note('G4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('F4', 'quarter'),
        note('Eb4', 'quarter'),
        note('D4', 'quarter'),
        note('D4', 'quarter'),
      ]),
      measure([
        note('Eb4', 'quarter'),
        note('D4', 'quarter'),
        note('C4', 'quarter'),
        note('F4', 'quarter'),
      ]),
      measure([
        note('F4', 'quarter'),
        note('E4', 'quarter'),
        note('F4', 'quarter'),
        note('F4', 'quarter'),
      ]),
      measure([
        note('Bb4', 'quarter'),
        note('C5', 'quarter'),
        note('D5', 'quarter'),
        note('Bb4', 'quarter'),
      ]),
      measure([
        note('Eb5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('D5', 'quarter'),
      ]),
      measure([
        note('Bb4', 'quarter'),
        note('G4', 'quarter'),
        note('F4', 'quarter'),
        note('Bb4', 'quarter'),
      ]),
      measure([note('Bb4', 'quarter'), note('A4', 'quarter'), note('Bb4', 'quarter')]),
    ],
  }),
  arrangement: { style: 'grand', tonic: 'Bb3' },
});
