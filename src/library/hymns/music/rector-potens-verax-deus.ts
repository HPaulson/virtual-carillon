import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const rectorPotensVeraxDeus = defineHymn({
  id: 'rector-potens-verax-deus',
  name: 'Rector potens, verax Deus (Sext)',
  source: 'Traditional Latin office hymn, Gregorian chant for the Roman Breviary daytime office',
  sourceUrl: 'https://gregobase.selapa.net/chant.php?id=7885',
  license: 'Public-domain Gregorian hymn; source notation and transcription credited in this asset',
  liturgical: {
    categories: ['christological'],
    seasons: ['General', 'Ordinary Time'],
    offices: ['Daytime'],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 76,
    mode: 2,
    rhythmicCharacter: 'free',
    measures: [
      measure([note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('F4', 'half'), note('E4', 'quarter'), note('F4', 'quarter')]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('F4', 'quarter'), note('E4', 'quarter')]),
      measure([note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter'), note('C5', 'quarter')]),
      measure([note('B4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('F4', 'quarter'), note('E4', 'quarter'), note('D4', 'quarter'), note('F4', 'quarter')]),
      measure([note('F4', 'whole')]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'F3' },
});
