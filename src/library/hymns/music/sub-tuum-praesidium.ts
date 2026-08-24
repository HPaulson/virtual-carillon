import { defineHymn } from '../defineHymn.js';
import { melody, measure, note } from '../notation/index.js';

export const subTuumPraesidium = defineHymn({
  id: 'sub-tuum-praesidium',
  name: 'Sub tuum praesidium',
  source: 'The Liber Usualis, Solesmes 1961, p. 1861; Chants of the Church 1956, p. 143',
  sourceUrl: 'https://gregobase.selapa.net/chant.php?id=2064',
  license: 'Public-domain Gregorian antiphon; source transcription credited to Andrew Hinkley',
  liturgical: { categories: ['marian', 'confidence'], seasons: ['General', 'Ordinary Time'], offices: ['Compline'], feasts: [] },
  notation: melody({ meter: { numerator: 1, denominator: 1 }, unitLength: 'sixteenth', key: 'C', tempo: 48, mode: undefined, rhythmicCharacter: 'free', measures: [
    measure([note('E5', { beats: 1 }), note('E4', { beats: 1 }), note('G5', { beats: 1 }), note('A4', { beats: 1 }), note('B5', { beats: 1 }), note('B4', { beats: 1 }), note('G5', { beats: 1 }), note('A4', { beats: 1 }), note('B4', { beats: 0.5 }), note('C5', { beats: 1 }), note('C5', { beats: 1 }), note('B4', { beats: 2 }), note('B4', { beats: 1 }), note('B4', { beats: 1 }), note('A5', { beats: 1 }), note('F4', { beats: 1 }), note('A5', { beats: 1 }), note('A4', { beats: 1 }), note('G4', { beats: 2 }), note('E5', { beats: 1 }), note('E4', { beats: 1 }), note('G5', { beats: 1 }), note('A4', { beats: 1 }), note('B4', { beats: 1 }), note('B4', { beats: 0.5 }), note('A4', { beats: 0.5 }), note('E5', { beats: 0.5 }), note('C5', { beats: 1 })], true),
    measure([note('B4', { beats: 2 }), note('C5', { beats: 1 }), note('B4', { beats: 1 }), note('A5', { beats: 1 }), note('F4', { beats: 1 }), note('G4', { beats: 0.5 }), note('A4', { beats: 0.5 }), note('E5', { beats: 0.5 }), note('A4', { beats: 1 })], true),
    measure([note('B4', { beats: 0.5 }), note('A4', { beats: 1 }), note('F4', { beats: 1 }), note('G5', { beats: 1 }), note('F4', { beats: 1 }), note('E5', { beats: 1 }), note('E4', { beats: 2 })], true),
    measure([note('F4', { beats: 1 }), note('D5', { beats: 1 }), note('F4', { beats: 1 }), note('A5', { beats: 1 }), note('G4', { beats: 1 }), note('F4', { beats: 1 }), note('A4', { beats: 0.5 }), note('B4', { beats: 1 }), note('B4', { beats: 2 }), note('B4', { beats: 1 }), note('B4', { beats: 1 }), note('A5', { beats: 1 }), note('A4', { beats: 1 }), note('B4', { beats: 0.5 }), note('C5', { beats: 0.5 }), note('B4', { beats: 1 }), note('A4', { beats: 0.5 }), note('G4', { beats: 0.5 }), note('A4', { beats: 0.5 }), note('B4', { beats: 0.5 }), note('A4', { beats: 2 }), note('F5', { beats: 1 }), note('E4', { beats: 1 }), note('F5', { beats: 1 }), note('A4', { beats: 0.5 }), note('B4', { beats: 1 }), note('A4', { beats: 0.5 }), note('B4', { beats: 1 }), note('A4', { beats: 0.5 }), note('G4', { beats: 1 }), note('F4', { beats: 0.5 }), note('E4', { beats: 1 }), note('F4', { beats: 0.5 }), note('E4', { beats: 1 }), note('F4', { beats: 0.5 }), note('G4', { beats: 0.5 }), note('A4', { beats: 0.5 }), note('F4', { beats: 1 }), note('G4', { beats: 0.5 }), note('A4', { beats: 0.5 }), note('A4', { beats: 0.5 }), note('F4', { beats: 1 })], true),
    measure([note('E4', { beats: 2 }), note('E4', { beats: 2 })], true)
  ] }),
  arrangement: { style: 'contemplative', tonic: 'E3' },
});
