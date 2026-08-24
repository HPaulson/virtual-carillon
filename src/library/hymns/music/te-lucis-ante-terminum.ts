import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const teLucisAnteTerminum = defineHymn({
  id: 'te-lucis-ante-terminum',
  name: 'Te lucis ante terminum',
  source: 'Liber Hymnarius, Solesmes 1983, p. 241, Mode VIII',
  sourceUrl:
    'https://www.gregorianum.org/index.php?mobileaction=toggle_view_mobile&title=Te_lucis_ante_terminum_%28ad_Completorium%29',
  license: 'Public-domain hymn and traditional melody; project transcription from the cited source',
  liturgical: {
    categories: ['christological', 'confidence'],
    seasons: ['General', 'Ordinary Time'],
    offices: ['Compline'],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 92,
    mode: 8,
    rhythmicCharacter: 'free',
    measures: [
      measure([
        note('A4', 'quarter'),
        note('C5', 'quarter'),
        note('C5', 'quarter'),
        note('C5', 'quarter'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('D5', 'quarter'),
        note('C5', 'quarter'),
        note('B5', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'half'),
      ]),
      measure([
        note('B4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('F4', 'quarter'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('A5', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('C5', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
        note('G4', 'half'),
      ]),
    ],
  }),
  arrangement: { style: 'contemplative', tonic: 'G3' },
});
