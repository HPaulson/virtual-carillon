import { defineHymn } from '../defineHymn.js';
import { melody, measure, note, rest } from '../notation/index.js';

export const comeThouFount = defineHymn({
  id: 'come-thou-fount',
  name: 'Come, Thou Fount of Every Blessing (NETTLETON)',
  source: 'NETTLETON, melody from John Wyeth, Repository of Sacred Music, Part Second (1813)',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=dmc.lizmilner.com%2Fviewabc.vbhtml%3Ffile%3DCome+Thou+Fount+of+Every+Blessing%2F0002',
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
    meter: { numerator: 3, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'D',
    tempo: 100,
    rhythmicCharacter: 'metered',
    pickup: [note('F#4', 'eighth'), note('E4', 'eighth')],
    measures: [
      measure([
        note('D4', 'quarter'),
        note('D4', 'quarter'),
        note('F#4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('E4', 'quarter'),
        note('E4', 'quarter'),
        note('F#4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('F#4', 'eighth'),
        note('E4', 'eighth'),
      ]),
      measure([note('D4', 'half'), note('F#4', 'eighth'), note('E4', 'eighth')]),
      measure([
        note('D4', 'quarter'),
        note('D4', 'quarter'),
        note('F#4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('E4', 'quarter'),
        note('E4', 'quarter'),
        note('F#4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('F#4', 'eighth'),
        note('E4', 'eighth'),
      ]),
      measure([
        note('D4', 'half'),
        note('A4', 'eighth'),
        note('B4', 'sixteenth'),
        note('C#5', 'sixteenth'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('C#5', 'quarter'),
        note('B4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('B4', 'eighth'),
        note('A4', 'eighth'),
        note('F#4', 'quarter'),
        note('A4', 'eighth'),
        note('B4', 'sixteenth'),
        note('C#5', 'sixteenth'),
      ]),
      measure([
        note('D5', 'quarter'),
        note('C#5', 'quarter'),
        note('B4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([note('D5', 'half'), note('F#4', 'eighth'), note('E4', 'eighth')]),
      measure([
        note('D4', 'quarter'),
        note('D4', 'quarter'),
        note('F#4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('E4', 'quarter'),
        note('E4', 'quarter'),
        note('F#4', 'eighth'),
        note('A4', 'eighth'),
      ]),
      measure([
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('F#4', 'eighth'),
        note('E4', 'eighth'),
      ]),
      measure([note('D4', 'half'), rest('quarter')]),
    ],
  }),
  arrangement: { style: 'flowing', tonic: 'D3' },
});
