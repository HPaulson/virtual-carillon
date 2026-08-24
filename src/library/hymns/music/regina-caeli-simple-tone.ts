import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const reginaCaeliSimpleTone = defineHymn({
  id: 'regina-caeli',
  name: 'Regina caeli (Tonus Simplex)',
  source:
    'The Liber Usualis, Solesmes 1961, p. 278, Gregorian chant Mode VI; sung from Easter through Pentecost',
  sourceUrl: 'https://www.gregorianum.org/wiki/Regina_Caeli_%28Tono_Simplex%29',
  license:
    'Public-domain chant; project transcription from cited source; source edition not bundled',
  liturgical: {
    categories: ['marian', 'resurrection'],
    seasons: ['Easter'],
    offices: ['Compline'],
    feasts: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 92,
    mode: 6,
    rhythmicCharacter: 'free',
    measures: [
      measure([
        note('F4', 'quarter'),
        note('G4', 'quarter'),
        note('F5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([
        note('A4', 'half'),
        note('B4', 'eighth'),
        note('B4', 'quarter'),
        note('A4', 'quarter'),
      ]),
      measure([
        note('G5', 'quarter'),
        note('B4', 'eighth'),
        note('B4', 'quarter'),
        note('A5', 'quarter'),
        note('G4', 'quarter'),
      ]),
      measure([note('F4', 'half'), note('F4', 'quarter'), note('C6', 'quarter')]),
      measure([
        note('C5', 'quarter'),
        note('D6', 'quarter'),
        note('C5', 'quarter'),
        note('B4', 'eighth'),
        note('B5', 'quarter'),
      ]),
      measure([
        note('A4', 'quarter'),
        note('F5', 'quarter'),
        note('G5', 'quarter'),
        note('A5', 'quarter'),
      ]),
      measure([
        note('B4', 'eighth'),
        note('B4', 'quarter'),
        note('A5', 'quarter'),
        note('G4', 'quarter'),
        note('F4', 'half'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('C6', 'quarter'),
        note('D5', 'quarter'),
        note('C6', 'quarter'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('F5', 'quarter'),
        note('G4', 'quarter'),
        note('F5', 'quarter'),
      ]),
      measure([
        note('G4', 'quarter'),
        note('A5', 'quarter'),
        note('B4', 'eighth'),
        note('B4', 'quarter'),
        note('C5', 'half'),
      ]),
      measure([
        note('C5', 'quarter'),
        note('F4', 'quarter'),
        note('G5', 'quarter'),
        note('B4', 'eighth'),
        note('B4', 'quarter'),
      ]),
      measure([note('A5', 'quarter'), note('G4', 'quarter'), note('F4', 'half')]),
      measure([
        note('E4', 'quarter'),
        note('G4', 'quarter'),
        note('G4', 'eighth'),
        note('G4', 'quarter'),
        note('F4', 'half'),
      ]),
    ],
  }),
  arrangement: { style: 'flowing', tonic: 'F3' },
});
