import { defineHymn } from '../defineHymn.js';
import { veniCreatorNotation } from '../notation/tunes/veni-creator.js';

export const comeHolyGhostCreatorBlest = defineHymn({
  id: 'come-holy-ghost-creator-blest',
  name: 'Come, Holy Ghost, Creator Blest (VENI CREATOR)',
  liturgical: {
    categories: ['holy-spirit', 'christological'],
    seasons: ['Easter'],
    offices: [],
    feasts: ['pentecost'],
  },
  notation: veniCreatorNotation,
  arrangement: { style: 'grand', tonic: 'E3' },
});
