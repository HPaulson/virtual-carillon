import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const aeternaChristiMunera = defineHymn({
  id: 'aeterna-christi-munera',
  name: 'Æterna Christi munera (Common of Apostles)',
  source: 'Traditional Latin office hymn, Gregorian chant for Matins in the Common of Apostles',
  sourceUrl:
    'https://www.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayMatutinum&date1=5-8-2024&lang2=English&testmode=seasonal&version=Ordo+Praedicatorum+-+1962&votive=',
  license: 'Public-domain Gregorian hymn; source tradition and transcription credited in this asset',
  tags: ['Hymn', 'Gregorian', 'Apostles', 'Martyrs', 'Matins'],
  liturgical: {
    categories: ['apostles', 'saints', 'martyrs'],
    seasons: ['General', 'Ordinary Time'],
    offices: ['Matins'],
    feasts: [],
    solemnities: [],
  },
  notation: melody({
    meter: { numerator: 1, denominator: 1 },
    unitLength: 'sixteenth',
    key: 'C',
    tempo: 76,
    mode: 1,
    rhythmicCharacter: 'free',
    measures: [
      measure([note('D4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('G4', 'quarter'), note('A4', 'quarter'), note('C5', 'quarter'), note('B4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('D4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('C5', 'half'), note('B4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'quarter'), note('F4', 'quarter'), note('E4', 'quarter'), note('D4', 'quarter')]),
      measure([note('D4', 'whole')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'D3' },
});
