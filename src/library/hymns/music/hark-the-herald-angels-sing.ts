import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const harkTheHeraldAngelsSing = defineHymn({
  id: 'hark-the-herald-angels-sing',
  name: 'Hark! The Herald Angels Sing (MENDELSSOHN)',
  source: 'Felix Mendelssohn, 1840, public-domain hymn tune',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fdemo%2FTunes%2FHarkTheHeraldAngelsSing%2F0000',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  liturgical: {
    categories: ['christological'],
    seasons: ['Christmas'],
    offices: [],
    feasts: ['nativity-of-the-lord'],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 100,
    rhythmicCharacter: 'metered',
    measures: [
      measure([
        note('D4', 'quarter'),
        note('G4', 'quarter'),
        note('G4', 'dotted-quarter'),
        note('F#4', 'eighth'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('B4', 'quarter'), note('A4', 'quarter'), note('B4', 'half')]),
      measure([
        note('D4', 'quarter'),
        note('G4', 'quarter'),
        note('G4', 'dotted-quarter'),
        note('F#4', 'eighth'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('F#4', 'quarter'), note('E4', 'quarter'), note('D4', 'half')]),
      measure([
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('E5', 'quarter'),
        note('E5', 'quarter'),
        note('E5', 'quarter'),
        note('D5', 'quarter'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('E4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'half'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('B4', 'eighth'),
        note('C5', 'eighth'),
        note('D5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('B4', 'half')]),
      measure([
        note('E5', 'quarter'),
        note('E5', 'quarter'),
        note('E5', 'quarter'),
        note('D5', 'quarter'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('E4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'half'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('B4', 'eighth'),
        note('C5', 'eighth'),
        note('D5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('G4', 'half')]),
    ],
  }),
  arrangement: { style: 'grand', tonic: 'G3' },
});
