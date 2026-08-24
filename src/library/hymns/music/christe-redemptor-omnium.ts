import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const christeRedemptorOmnium = defineHymn({
  id: 'christe-redemptor-omnium',
  name: 'Christe Redemptor Omnium (Christmas Vespers)',
  source: 'Traditional Latin office hymn, Gregorian chant for Christmas Vespers',
  sourceUrl: 'https://www.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayVesperae&date1=12-25-2020&lang2=Nederlands&testmode=regular&version=Tridentine+-+1570&votive=',
  license: 'Public-domain Gregorian hymn; breviary source and transcription credited in this asset',
  liturgical: { categories: ['christological'], seasons: ['Christmas'], offices: ['Vespers'], feasts: ['nativity-of-the-lord'] },
  notation: melody({
    meter: { numerator: 1, denominator: 1 }, unitLength: 'sixteenth', key: 'C', tempo: 72, mode: 2, rhythmicCharacter: 'free',
    measures: [
      measure([note('E4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('F4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'quarter'), note('E4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('E4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter'), note('A4', 'quarter')]),
      measure([note('G4', 'half'), note('F4', 'quarter'), note('E4', 'quarter')]),
      measure([note('D4', 'quarter'), note('E4', 'quarter'), note('F4', 'quarter'), note('G4', 'quarter')]),
      measure([note('A4', 'half'), note('G4', 'quarter'), note('F4', 'quarter')]),
      measure([note('E4', 'quarter'), note('D4', 'quarter'), note('C4', 'quarter'), note('D4', 'quarter')]),
      measure([note('E4', 'half'), note('D4', 'quarter'), note('C4', 'quarter')]),
      measure([note('D4', 'whole')]),
    ],
  }),
  arrangement: { style: 'solemn', tonic: 'C3' },
});
