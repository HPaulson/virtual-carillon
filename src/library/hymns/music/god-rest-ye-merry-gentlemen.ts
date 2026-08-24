import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, rest } from '../notation/index.js';

export const godRestYeMerryGentlemen = defineHymn({
  id: 'god-rest-ye-merry-gentlemen',
  name: 'God Rest Ye Merry, Gentlemen',
  source: 'Traditional English carol, source from Colin Hume’s ABC collection',
  sourceUrl: 'https://abcnotation.com/tunePage?a=colinhume.com%2FABC.txt%2F0242',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  liturgical: {
    categories: ['christological'],
    seasons: ['Christmas'],
    offices: [],
    feasts: ['nativity-of-the-lord'],
  },
  notation: melody({
    meter: { numerator: 2, denominator: 2 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('E4', 'quarter')],
    measures: [
      measure([
        note('E4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('F#4', 'quarter'),
        note('E4', 'quarter'),
        note('D4', 'quarter'),
      ]),
      measure([
        note('E4', 'quarter'),
        note('F#4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('B4', 'dotted-half'), note('E4', 'quarter')]),
      measure([
        note('E4', 'quarter'),
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('F#4', 'quarter'),
        note('E4', 'quarter'),
        note('D4', 'quarter'),
      ]),
      measure([
        note('E4', 'quarter'),
        note('F#4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('B4', 'half'), rest('quarter'), note('B4', 'quarter')]),
      measure([
        note('C5', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('E5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('E4', 'quarter'),
        note('F#4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('B4', 'half'), note('C5', 'quarter'), note('B4', 'quarter')]),
      measure([
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
        note('F#4', 'quarter'),
      ]),
      measure([
        note('E4', 'half'),
        note('G4', 'eighth'),
        note('F#4', 'eighth'),
        note('E4', 'quarter'),
      ]),
      measure([note('E4', 'whole')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'G3' },
});
