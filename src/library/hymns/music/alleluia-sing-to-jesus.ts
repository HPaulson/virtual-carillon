import { defineHymn } from '../defineHymn.js';
import { hyfrydolNotation } from '../notation/tunes/hyfrydol.js';

export const alleluiaSingToJesus = defineHymn({
  id: 'alleluia-sing-to-jesus',
  name: 'Alleluia! Sing to Jesus (HYFRYDOL)',
  source: 'HYFRYDOL, Rowland Hugh Prichard (1855), paired with the Ascension/Eucharistic hymn text',
  sourceUrl: 'https://hymnary.org/tune/hyfrydol',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  liturgical: {
    categories: ['eucharistic', 'christological'],
    seasons: ['Easter', 'General'],
    offices: [],
    feasts: ['ascension-of-the-lord', 'corpus-christi'],
  },
  notation: hyfrydolNotation,
  arrangement: { style: 'celebratory', tonic: 'F3' },
});
