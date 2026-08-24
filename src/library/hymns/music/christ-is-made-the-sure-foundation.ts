import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const christIsMadeTheSureFoundation = defineHymn({
  id: 'christ-is-made-the-sure-foundation',
  name: 'Christ Is Made the Sure Foundation (WESTMINSTER ABBEY)',
  source: 'John Mason Neale translation of the traditional Latin Angularis fundamentum; WESTMINSTER ABBEY tune',
  sourceUrl: 'https://hymnary.org/text/christ_is_made_the_sure_foundation',
  license: 'Public-domain text and melody; source tune record and transcription credited in this asset',
  tags: ['Hymn', 'Church Dedication', 'Foundation', 'Praise'],
  liturgical: {
    categories: ['dedication-of-a-church', 'christological', 'praise'],
    seasons: ['General', 'Ordinary Time'],
    offices: ['Lauds'],
    feasts: ['dedication-of-a-church'],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'G',
    tempo: 92,
    rhythmicCharacter: 'metered',
    measures: [
      measure([note('G4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter'), note('B4', 'quarter')]),
      measure([note('D5', 'half'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('B4', 'quarter'), note('D5', 'quarter')]),
      measure([note('C5', 'half'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter'), note('B4', 'quarter')]),
      measure([note('D5', 'half'), note('C5', 'quarter'), note('B4', 'quarter')]),
      measure([note('A4', 'quarter'), note('B4', 'quarter'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('G4', 'whole')]),
    ],
  }),
  arrangement: { style: 'celebratory', tonic: 'G3' },
});
