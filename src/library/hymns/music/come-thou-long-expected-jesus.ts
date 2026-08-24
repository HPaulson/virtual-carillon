import { defineHymn } from '../defineHymn.js';
import { hyfrydolNotation } from '../notation/tunes/hyfrydol.js';

export const comeThouLongExpectedJesus = defineHymn({
  id: 'come-thou-long-expected-jesus',
  name: 'Come, Thou Long-Expected Jesus (HYFRYDOL)',
  source: 'HYFRYDOL, Rowland Hugh Prichard (1855), paired with the Advent hymn text',
  sourceUrl: 'https://hymnary.org/tune/hyfrydol',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn', 'Advent'],
  liturgical: {
    categories: ['advent', 'christological'],
    seasons: ['Advent'],
    offices: [],
    feasts: [],
    solemnities: [],
  },
  notation: hyfrydolNotation,
  arrangement: { style: 'flowing', tonic: 'F3' },
});
