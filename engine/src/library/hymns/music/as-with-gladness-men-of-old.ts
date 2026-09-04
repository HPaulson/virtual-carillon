import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const asWithGladnessMenOfOld = defineHymn({
  id: 'as-with-gladness-men-of-old',
  name: 'As with Gladness Men of Old (DIX)',
  liturgical: {
    categories: ['christological'],
    seasons: ['Christmas', 'Epiphany'],
    offices: [],
    feasts: ['epiphany-of-the-lord'],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'A',
    tempo: 100,
    rhythmicCharacter: 'metered',
    measures: [
      measure([
        note('A4', 'quarter'),
        note('G#4', 'eighth'),
        note('A4', 'eighth'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('D5', 'quarter'), note('D5', 'quarter'), note('C#5', 'half')]),
      measure([
        note('F#4', 'quarter'),
        note('G#4', 'quarter'),
        note('A4', 'quarter'),
        note('F#4', 'quarter'),
      ]),
      measure([note('E4', 'quarter'), note('E4', 'quarter'), note('E4', 'half')]),
      measure([
        note('A4', 'quarter'),
        note('G#4', 'eighth'),
        note('A4', 'eighth'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([note('D5', 'quarter'), note('D5', 'quarter'), note('C#5', 'half')]),
      measure([
        note('F#4', 'quarter'),
        note('G#4', 'quarter'),
        note('A4', 'quarter'),
        note('F#4', 'quarter'),
      ]),
      measure([note('E4', 'quarter'), note('E4', 'quarter'), note('E4', 'half')]),
      measure([
        note('C#5', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('C#5', 'quarter'),
      ]),
      measure([note('E5', 'dotted-quarter'), note('D5', 'eighth'), note('C#5', 'half')]),
      measure([
        note('F#4', 'quarter'),
        note('G#4', 'quarter'),
        note('A4', 'quarter'),
        note('D5', 'quarter'),
      ]),
      measure([note('C#5', 'quarter'), note('B4', 'quarter'), note('A4', 'half')]),
    ],
  }),
  arrangement: { style: 'flowing', tonic: 'A3' },
});
