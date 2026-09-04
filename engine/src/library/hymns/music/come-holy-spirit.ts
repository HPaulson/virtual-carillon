import { defineHymn } from '../defineHymn.js';
import { veniCreatorNotation } from '../notation/tunes/veni-creator.js';

export const comeHolySpirit = defineHymn({
  id: 'come-holy-spirit',
  name: 'Come, Holy Spirit (VENI CREATOR)',
  liturgical: {
    categories: ['holy-spirit', 'christological'],
    seasons: ['Easter'],
    offices: [],
    feasts: ['pentecost'],
  },
  notation: veniCreatorNotation,
  arrangement: { style: 'grand', tonic: 'E3' },
});
