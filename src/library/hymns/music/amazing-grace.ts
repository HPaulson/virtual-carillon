import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, rest } from '../notation/index.js';

export const amazingGrace = defineHymn({
  id: 'amazing-grace',
  name: 'Amazing Grace (NEW BRITAIN)',
  source: 'Traditional tune NEW BRITAIN, early American melody',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fsong%2FAmazing_Grace_G%2F0000',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn', 'General'],
  liturgical: {
    categories: ['christological'],
    seasons: ['General', 'Ordinary Time'],
    offices: ['Lauds', 'Vespers'],
    feasts: [],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 3, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 80,
    rhythmicCharacter: 'metered',
    pickup: [note('D4', 'quarter')],
    measures: [
      measure([note('G4', 'half'), note('B4', 'eighth'), note('G4', 'eighth')]),
      measure([note('B4', 'half'), note('A4', 'quarter')]),
      measure([note('G4', 'quarter'), note('E4', 'quarter'), note('D4', 'half')]),
      measure([note('D4', 'quarter'), note('G4', 'half')]),
      measure([
        note('B4', 'eighth'),
        note('G4', 'eighth'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('D5', 'dotted-half')]),
      measure([note('D5', 'quarter'), rest('quarter'), note('B4', 'quarter')]),
      measure([
        note('D5', 'dotted-quarter'),
        note('B4', 'eighth'),
        note('D5', 'eighth'),
        note('B4', 'eighth'),
      ]),
      measure([note('G4', 'half'), note('D4', 'quarter')]),
      measure([
        note('E4', 'dotted-quarter'),
        note('G4', 'eighth'),
        note('G4', 'eighth'),
        note('E4', 'eighth'),
      ]),
      measure([note('D4', 'half'), note('D4', 'quarter')]),
      measure([note('G4', 'half'), note('B4', 'eighth'), note('G4', 'eighth')]),
      measure([note('B4', 'quarter'), note('A4', 'quarter'), note('G4', 'dotted-half')]),
      measure([note('G4', 'quarter'), rest('quarter')]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'G3' },
});
