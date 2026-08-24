import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const psalm51Miserere = defineHymn({
  id: 'psalm-51-miserere',
  name: 'Psalm 51 (Miserere mei, Deus)',
  source: 'Graduale Simplex, 1988, Psalmus 50 in the Vulgate numbering, Tone I f',
  sourceUrl: 'https://www.gregorianum.org/wiki/Psalmus_50%2C_Miserere_mei%2C_Deus_%28Tonus_I_f%29',
  license: 'Public-domain chant; source notation and transcriber credited in the bundled GABC',
  tags: ['Psalm', 'Gregorian', 'Lent', 'Penitential'],
  liturgical: {
    categories: ['penitential', 'repentance', 'psalm', 'all-souls'],
    seasons: ['Lent'],
    offices: [],
    feasts: ['ash-wednesday', 'all-souls'],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 92,
    rhythmicCharacter: 'free',
    measures: [
      measure([
        note('F4', 'quarter'),
        note('G4', 'eighth'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('B4', 'eighth'),
        note('B4', 'eighth'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'eighth'),
        note('A4', 'quarter'),
      ]),
      measure([note('A4', 'half'), note('A4', 'quarter'), note('A4', 'quarter')]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('F4', 'quarter'),
        note('G4', 'eighth'),
        note('A4', 'eighth'),
        note('G4', 'quarter'),
        note('G4', 'eighth'),
        note('F4', 'half'),
      ]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'F3' },
});
