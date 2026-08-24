import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const whenISurveyTheWondrousCross = defineHymn({
  id: 'when-i-survey-the-wondrous-cross',
  name: 'When I Survey the Wondrous Cross (HAMBURG)',
  source: 'HAMBURG, Lowell Mason, 1824, adapted from a Gregorian chant; public-domain tune',
  sourceUrl: 'https://en.wikipedia.org/wiki/When_I_Survey_the_Wondrous_Cross',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn', 'Lent', 'Holy Week'],
  liturgical: {
    categories: ['lent', 'holy-week', 'cross-passion'],
    seasons: ['Lent', 'Holy Week'],
    offices: ['Vespers', 'Compline'],
    feasts: ['good-friday'],
    solemnities: ['good-friday'],
  },
  notation: melody({
    meter: { numerator: 4, denominator: 4 },
    unitLength: 'sixteenth',
    key: 'F',
    tempo: 100,
    rhythmicCharacter: 'metered',
    measures: [
      measure([note('F4', 'half'), note('F4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('Bb4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'whole')]),
      measure([note('A4', 'half'), note('A4', 'quarter'), note('A4', 'quarter')]),
      measure([note('Bb4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('F4', 'half'), note('E4', 'quarter'), note('F4', 'quarter')]),
      measure([note('G4', 'whole')]),
      measure([note('F4', 'half'), note('F4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('Bb4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'whole')]),
      measure([note('A4', 'half'), note('A4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('F4', 'quarter'), note('G4', 'half')]),
      measure([note('A4', 'quarter'), note('G4', 'quarter'), note('F4', 'whole')]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'F3' },
});
