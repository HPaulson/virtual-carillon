import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const vexillaRegis = defineHymn({
  id: 'vexilla-regis',
  name: 'Vexilla Regis (Passiontide Vespers)',
  source: 'Venantius Fortunatus, traditional Gregorian office hymn for Passiontide Vespers',
  sourceUrl: 'https://www2.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayVesperae&date1=04-14-2025&lang2=Latin-gabc&version=Tridentine+-+1906&votive=Hodie',
  license: 'Public-domain Gregorian hymn; breviary source and transcription credited in this asset',
  liturgical: { categories: ['passion', 'christological'], seasons: ['Holy Week', 'Lent'], offices: ['Vespers'], feasts: [] },
  notation: melody({
    meter: { numerator: 1, denominator: 1 }, unitLength: 'sixteenth', key: 'D', tempo: 72, mode: 1, rhythmicCharacter: 'free',
    measures: [
      measure([note('D4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('E4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('F4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'quarter'), note('E4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('E4', 'quarter'), note('D4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('E4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('D5', 'half'), note('C5', 'quarter'), note('B4', 'quarter')]),
      measure([note('A4', 'quarter'), note('G4', 'quarter'), note('F4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'whole')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'D3' },
});
