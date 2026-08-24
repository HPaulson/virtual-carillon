import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const abideWithMe = defineHymn({
  id: 'abide-with-me',
  name: 'Abide with Me (traditional setting)',
  source: 'Traditional Welsh melody as preserved in the public-domain Sudbury Ancient hymn source',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fsession%2FSAFD%2F___%2FHymns%2F0001',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn'],
  liturgical: {
    categories: ['christological'],
    seasons: ['General', 'Ordinary Time'],
    offices: [],
    feasts: [],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 100,
    rhythmicCharacter: 'metered',
    measures: [
      measure([note('B4', 'half'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('D5', 'half')]),
      measure([
        note('E5', 'quarter'),
        note('D5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('B4', 'whole')]),
      measure([note('B4', 'half'), note('C5', 'quarter'), note('D5', 'quarter')]),
      measure([note('E5', 'half'), note('D5', 'half')]),
      measure([
        note('C5', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('C#5', 'quarter'),
      ]),
      measure([note('D5', 'whole')]),
      measure([note('B4', 'half'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('D5', 'half')]),
      measure([
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([note('A4', 'whole')]),
      measure([note('A4', 'half'), note('B4', 'quarter'), note('C5', 'quarter')]),
      measure([
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([note('B4', 'half'), note('A4', 'half')]),
      measure([note('G4', 'whole')]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'G3' },
});
