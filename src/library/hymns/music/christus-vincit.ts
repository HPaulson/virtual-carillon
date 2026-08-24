import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const christusVincit = defineHymn({
  id: 'christus-vincit',
  name: 'Christus vincit',
  source: 'Traditional Laudes Regiae acclamation; GregoBase transcription, Aloys Kunc version',
  sourceUrl: 'https://gregobase.selapa.net/chant.php?id=18832',
  license: 'Public-domain chant; project transcription from cited source; source edition not bundled',
  liturgical: {
    categories: ['christological', 'praise'],
    seasons: ['General', 'Ordinary Time'],
    offices: [],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 92,
    mode: 4,
    rhythmicCharacter: 'free',
    measures: [
      measure([
        note('A4', 'quarter'),
        note('A4', 'eighth'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('A5', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('A4', 'eighth'),
        note('G4', 'quarter'),
        note('A4', 'quarter'),
        note('A4', 'half'),
      ]),
      measure([
        note('A5', 'quarter'),
        note('G4', 'quarter'),
        note('A5', 'quarter'),
        note('E4', 'quarter'),
      ]),
      measure([note('E4', 'half')]),
    ],
  }),
  arrangement: { style: 'grand', tonic: 'E3' },
});
