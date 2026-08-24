import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const hymnToJoy = defineHymn({
  id: 'hymn-to-joy',
  name: 'Hymn to Joy (ODE TO JOY)',
  source: 'Ludwig van Beethoven, Symphony No. 9 (1824), public-domain melody',
  sourceUrl: 'https://hymnary.org/tune/hymn_to_joy_beethoven',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  liturgical: {
    categories: ['praise'],
    seasons: ['General', 'Ordinary Time'],
    offices: [],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 100,
    rhythmicCharacter: 'metered',
    measures: [
      measure([
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'quarter'),
        note('D5', 'quarter'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([note('B4', 'quarter'), note('A4', 'quarter'), note('A4', 'half')]),
      measure([
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('C5', 'quarter'),
        note('D5', 'quarter'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([note('A4', 'quarter'), note('G4', 'quarter'), note('G4', 'half')]),
    ],
  }),
  arrangement: { style: 'celebratory', tonic: 'G3' },
});
