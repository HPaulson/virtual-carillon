import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const angelsFromTheRealmsOfGlory = defineHymn({
  id: 'angels-from-the-realms-of-glory',
  name: 'Angels from the Realms of Glory (IRIS)',
  source: 'Traditional French melody IRIS, 18th century',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fxmas%2FAngels_From_the_Realms_of_Glory%2F0000',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn', 'Christmas', 'Epiphany'],
  liturgical: {
    categories: ['christmas', 'epiphany', 'angels'],
    seasons: ['Christmas', 'Epiphany'],
    offices: [],
    feasts: ['nativity-of-the-lord', 'epiphany-of-the-lord'],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 100,
    rhythmicCharacter: 'metered',
    measures: [
      measure([
        note('G4', 'quarter'),
        note('E4', 'quarter'),
        note('C5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('E5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('G4', 'quarter'), note('F4', 'quarter'), note('E4', 'half')]),
      measure([
        note('G4', 'quarter'),
        note('E4', 'quarter'),
        note('C5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('E5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'eighth'),
        note('C5', 'eighth'),
      ]),
      measure([note('B4', 'quarter'), note('A4', 'quarter'), note('G4', 'half')]),
      measure([
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('B4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('E5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('F5', 'quarter'),
        note('E5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('C5', 'quarter'), note('B4', 'quarter'), note('C5', 'half')]),
    ],
  }),
  arrangement: { style: 'celebratory', tonic: 'C3' },
});
