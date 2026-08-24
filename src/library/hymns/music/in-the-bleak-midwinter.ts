import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, rest, section } from '../notation/index.js';

export const inTheBleakMidwinter = defineHymn({
  id: 'in-the-bleak-midwinter',
  name: 'In the Bleak Midwinter',
  source: 'Gustav Holst, public-domain hymn tune CRANHAM',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2FEngland%2FInTheBleakMidwinter%2F0004',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn', 'Christmas', 'Favorite'],
  liturgical: {
    categories: ['christological', 'incarnation', 'nativity'],
    seasons: ['Christmas'],
    offices: ['Vespers', 'Compline'],
    feasts: ['christmas'],
    solemnities: ['christmas'],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'A',
    tempo: 72,
    rhythmicCharacter: 'metered',
    sections: [
      section(
        [
          measure([
            note('C#5', 'quarter'),
            note('D5', 'quarter'),
            note('E5', 'quarter'),
            note('C#5', 'quarter'),
          ]),
          measure([note('B4', 'half'), note('A4', 'half')]),
          measure([
            note('B4', 'quarter'),
            note('C#5', 'quarter'),
            note('B4', 'quarter'),
            note('F#4', 'quarter'),
          ]),
          measure([note('B4', 'dotted-half'), rest('quarter')]),
          measure([
            note('C#5', 'quarter'),
            note('D5', 'quarter'),
            note('E5', 'quarter'),
            note('C#5', 'quarter'),
          ]),
          measure([note('B4', 'half'), note('A4', 'half')]),
          measure([
            note('B4', 'quarter'),
            note('C#5', 'quarter'),
            note('B4', 'quarter'),
            note('A4', 'quarter'),
          ]),
          measure([note('A4', 'dotted-half'), rest('quarter')]),
        ],
        { repeat: 2 },
      ),
      section([
        measure([
          note('D5', 'quarter'),
          note('C#5', 'quarter'),
          note('D5', 'quarter'),
          note('E5', 'quarter'),
        ]),
        measure([note('F#5', 'half'), note('C#5', 'half')]),
        measure([
          note('E5', 'quarter'),
          note('C#5', 'quarter'),
          note('B4', 'quarter'),
          note('A4', 'quarter'),
        ]),
        measure([note('B4', 'dotted-half'), rest('quarter')]),
        measure([
          note('C#5', 'quarter'),
          note('D5', 'quarter'),
          note('E5', 'quarter'),
          note('C#5', 'quarter'),
        ]),
        measure([note('B4', 'half'), note('A4', 'half')]),
        measure([
          note('B4', 'quarter'),
          note('C#5', 'quarter'),
          note('B4', 'quarter'),
          note('A4', 'quarter'),
        ]),
        measure([note('A4', 'dotted-half'), rest('quarter')]),
      ]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'A3' },
});
