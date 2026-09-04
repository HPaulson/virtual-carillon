import { defineHymn } from '../defineHymn.js';
import { hyfrydolNotation } from '../notation/tunes/hyfrydol.js';

export const comeThouLongExpectedJesus = defineHymn({
  id: 'come-thou-long-expected-jesus',
  name: 'Come, Thou Long-Expected Jesus (HYFRYDOL)',
  liturgical: {
    categories: ['christological'],
    seasons: ['Advent'],
    offices: [],
    feasts: [],
  },
  notation: hyfrydolNotation,
  arrangement: { style: 'flowing', tonic: 'F3' },
});
