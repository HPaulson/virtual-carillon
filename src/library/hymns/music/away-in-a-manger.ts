import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const awayInAManger = defineHymn({
  id: 'away-in-a-manger',
  name: 'Away in a Manger',
  source: 'Traditional carol; public ABC melody source from the Paul Hardy collection',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=pghardy.net%2Ftunebooks%2Fpgh_xmas_tunebook%2F0006',
  license: 'Public-domain melody; project transcription from a public ABC source',
  liturgical: {
    categories: ['christological', 'incarnation'],
    seasons: ['Christmas'],
    offices: [],
    feasts: ['nativity-of-the-lord'],
  },
  notation: melody({
    meter: { numerator: 3, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'F',
    tempo: 84,
    rhythmicCharacter: 'metered',
    pickup: [note('C5', 'quarter')],
    measures: [
      measure([note('C5', 'dotted-quarter'), note('Bb4', 'eighth'), note('A4', 'quarter')]),
      measure([note('A4', 'quarter'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('F4', 'quarter'), note('E4', 'quarter'), note('D4', 'quarter')]),
      measure([note('C4', 'half'), note('C4', 'quarter')]),
      measure([note('C4', 'dotted-quarter'), note('D4', 'eighth'), note('C4', 'quarter')]),
      measure([note('C4', 'quarter'), note('G4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'quarter'), note('C4', 'quarter'), note('F4', 'quarter')]),
      measure([note('A4', 'half'), note('C5', 'quarter')]),
      measure([note('C5', 'dotted-quarter'), note('Bb4', 'eighth'), note('A4', 'quarter')]),
      measure([note('A4', 'quarter'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('F4', 'quarter'), note('E4', 'quarter'), note('D4', 'quarter')]),
      measure([note('C4', 'half'), note('C4', 'quarter')]),
      measure([note('Bb4', 'dotted-quarter'), note('A4', 'eighth'), note('G4', 'quarter')]),
      measure([note('A4', 'quarter'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('G4', 'quarter'), note('D4', 'quarter'), note('E4', 'quarter')]),
      measure([note('F4', 'half')]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'F3' },
});
