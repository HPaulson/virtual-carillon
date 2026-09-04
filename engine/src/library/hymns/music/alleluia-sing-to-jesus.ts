import { defineHymn } from '../defineHymn.js';
import { hyfrydolNotation } from '../notation/tunes/hyfrydol.js';

export const alleluiaSingToJesus = defineHymn({
  id: 'alleluia-sing-to-jesus',
  name: 'Alleluia! Sing to Jesus (HYFRYDOL)',
  liturgical: {
    categories: ['eucharistic', 'christological'],
    seasons: ['Easter', 'General'],
    offices: [],
    feasts: ['ascension-of-the-lord', 'corpus-christi'],
  },
  notation: hyfrydolNotation,
  arrangement: { style: 'celebratory', tonic: 'F3' },
});
