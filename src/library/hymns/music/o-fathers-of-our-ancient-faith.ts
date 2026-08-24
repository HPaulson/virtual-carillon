import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const oFathersOfOurAncientFaith = defineHymn({
  id: 'o-fathers-of-our-ancient-faith',
  name: 'O Fathers of Our Ancient Faith (CREATOR ALME SIDERUM)',
  source:
    'Text by the Benedictine Nuns of Stanbrook Abbey (Divine Office, 1974), set to the anonymous Creator Alme Siderum tune',
  sourceUrl: 'https://universalis.com/USA.Hartford/20260824/lauds.htm',
  license: 'Public-domain traditional melody; hymn text source and transcription credited in this asset',
  tags: ['Hymn', 'Gregorian', 'Apostles', 'Common of Apostles'],
  liturgical: {
    categories: ['apostles', 'saints'],
    seasons: ['General', 'Ordinary Time'],
    offices: ['Lauds'],
    feasts: [],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'D',
    tempo: 76,
    mode: 4,
    rhythmicCharacter: 'free',
    measures: [
      measure([note('D4', 'quarter'), note('E4', 'quarter'), note('F#4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('A4', 'quarter'), note('B4', 'quarter')]),
      measure([note('A4', 'quarter'), note('G4', 'quarter'), note('F#4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'half'), note('E4', 'quarter'), note('F#4', 'quarter')]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('F#4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'quarter'), note('E4', 'quarter'), note('F#4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F#4', 'quarter')]),
      measure([note('E4', 'quarter'), note('F#4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('B4', 'half'), note('A4', 'quarter'), note('G4', 'quarter')]),
      measure([note('F#4', 'quarter'), note('E4', 'quarter'), note('D4', 'half')]),
      measure([note('D4', 'quarter'), note('E4', 'quarter'), note('F#4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F#4', 'quarter')]),
      measure([note('E4', 'quarter'), note('F#4', 'quarter'), note('E4', 'quarter'), note('D4', 'quarter')]),
      measure([note('D4', 'whole')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'D3' },
});
