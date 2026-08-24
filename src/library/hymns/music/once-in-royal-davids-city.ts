import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, section } from '../notation/index.js';

export const onceInRoyalDavidsCity = defineHymn({
  id: 'once-in-royal-davids-city',
  name: 'Once in Royal David’s City (IRBY)',
  source: 'Henry John Gauntlett, 1849, public-domain hymn tune IRBY',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2FScotland%2Fair%2FOnceInRoyalDavidsCity_D%2F0000',
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
    key: 'D',
    tempo: 100,
    rhythmicCharacter: 'metered',
    sections: [
      section(
        [
          measure([
            note('A4', 'quarter'),
            note('C#5', 'quarter'),
            note('D5', 'dotted-quarter'),
            note('D5', 'eighth'),
          ]),
          measure([
            note('D5', 'eighth'),
            note('C#5', 'eighth'),
            note('D5', 'eighth'),
            note('E5', 'eighth'),
            note('E5', 'quarter'),
            note('D5', 'quarter'),
          ]),
          measure([
            note('D5', 'quarter'),
            note('F#5', 'quarter'),
            note('A5', 'dotted-quarter'),
            note('F#5', 'eighth'),
          ]),
          measure([
            note('F#5', 'eighth'),
            note('E5', 'eighth'),
            note('D5', 'eighth'),
            note('C#5', 'eighth'),
            note('D5', 'half'),
          ]),
        ],
        { repeat: 2 },
      ),
      section([
        measure([
          note('B5', 'quarter'),
          note('B5', 'quarter'),
          note('A5', 'dotted-quarter'),
          note('D5', 'eighth'),
        ]),
        measure([note('G5', 'quarter'), note('G5', 'quarter'), note('F#5', 'half')]),
        measure([
          note('B5', 'quarter'),
          note('B5', 'quarter'),
          note('A5', 'dotted-quarter'),
          note('F#5', 'eighth'),
        ]),
        measure([
          note('F#5', 'eighth'),
          note('E5', 'eighth'),
          note('D5', 'eighth'),
          note('C#5', 'eighth'),
          note('D5', 'half'),
        ]),
        measure([
          note('B5', 'quarter'),
          note('B5', 'quarter'),
          note('A5', 'dotted-quarter'),
          note('D5', 'eighth'),
        ]),
        measure([note('G5', 'quarter'), note('G5', 'quarter'), note('F#5', 'half')]),
        measure([
          note('B5', 'quarter'),
          note('B5', 'quarter'),
          note('A5', 'dotted-quarter'),
          note('F#5', 'eighth'),
        ]),
        measure([
          note('F#5', 'eighth'),
          note('E5', 'eighth'),
          note('D5', 'eighth'),
          note('C#5', 'eighth'),
          note('D5', 'half'),
        ]),
      ]),
    ],
  }),
  arrangement: { style: 'chorale', tonic: 'D3' },
});
