import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, section } from '../notation/index.js';

export const gloriaInExcelsisDeo = defineHymn({
  id: 'gloria-in-excelsis-deo',
  name: 'Gloria in excelsis Deo (Angels We Have Heard on High)',
  source: 'Traditional French carol, public-domain melody',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fxmas%2FAngels_We_Have_Heard_On_High-F-21%2F0000',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn', 'Christmas'],
  liturgical: {
    categories: ['christological', 'incarnation', 'praise'],
    seasons: ['Christmas'],
    offices: [],
    feasts: ['nativity-of-the-lord'],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'F',
    tempo: 92,
    rhythmicCharacter: 'metered',
    sections: [
      section(
        [
          measure([
            note('A4', 'quarter'),
            note('A4', 'quarter'),
            note('A4', 'quarter'),
            note('C5', 'quarter'),
          ]),
          measure([note('C5', 'quarter'), note('Bb4', 'quarter'), note('A4', 'half')]),
          measure([
            note('A4', 'quarter'),
            note('G4', 'quarter'),
            note('A4', 'quarter'),
            note('C5', 'quarter'),
          ]),
          measure([note('A4', 'quarter'), note('G4', 'quarter'), note('F4', 'half')]),
        ],
        { repeat: 2 },
      ),
      section([
        measure([
          note('C5', 'half'),
          note('D5', 'eighth'),
          note('C5', 'eighth'),
          note('Bb4', 'eighth'),
          note('A4', 'eighth'),
        ]),
        measure([
          note('Bb4', 'half'),
          note('C5', 'eighth'),
          note('Bb4', 'eighth'),
          note('A4', 'eighth'),
          note('G4', 'eighth'),
        ]),
        measure([
          note('A4', 'half'),
          note('Bb4', 'eighth'),
          note('A4', 'eighth'),
          note('G4', 'eighth'),
          note('F4', 'eighth'),
        ]),
        measure([note('G4', 'quarter'), note('C4', 'quarter'), note('C4', 'half')]),
        measure([
          note('F4', 'quarter'),
          note('G4', 'quarter'),
          note('A4', 'quarter'),
          note('Bb4', 'quarter'),
        ]),
        measure([note('A4', 'half'), note('G4', 'half')]),
        measure([
          note('C5', 'half'),
          note('D5', 'eighth'),
          note('C5', 'eighth'),
          note('Bb4', 'eighth'),
          note('A4', 'eighth'),
        ]),
        measure([
          note('Bb4', 'half'),
          note('C5', 'eighth'),
          note('Bb4', 'eighth'),
          note('A4', 'eighth'),
          note('G4', 'eighth'),
        ]),
        measure([
          note('A4', 'half'),
          note('Bb4', 'eighth'),
          note('A4', 'eighth'),
          note('G4', 'eighth'),
          note('F4', 'eighth'),
        ]),
        measure([note('G4', 'quarter'), note('C4', 'quarter'), note('C4', 'half')]),
        measure([
          note('F4', 'quarter'),
          note('G4', 'quarter'),
          note('A4', 'quarter'),
          note('Bb4', 'quarter'),
        ]),
        measure([note('A4', 'half'), note('G4', 'half')]),
        measure([note('F4', 'whole')]),
      ]),
    ],
  }),
  arrangement: { style: 'celebratory', tonic: 'F3' },
});
