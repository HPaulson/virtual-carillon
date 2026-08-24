import { defineHymn } from '../defineHymn.js';
import { veniCreatorNotation } from '../notation/tunes/veni-creator.js';

export const comeHolyGhostCreatorBlest = defineHymn({
  id: 'come-holy-ghost-creator-blest',
  name: 'Come, Holy Ghost, Creator Blest (VENI CREATOR)',
  source:
    'Veni Creator Spiritus, traditional Gregorian hymn; English text commonly titled Come, Holy Ghost, Creator Blest',
  sourceUrl: 'https://en.gregorianum.org/index.php?title=Veni_Creator_Spiritus',
  license: 'Public-domain chant; source GABC and traditional English title credited by source page',
  tags: ['Hymn', 'Pentecost', 'Holy Spirit'],
  liturgical: {
    categories: ['holy-spirit', 'pentecost', 'christological'],
    seasons: ['Easter', 'Pentecost'],
    offices: [],
    feasts: ['pentecost'],
    solemnities: [],
  },
  notation: veniCreatorNotation,
  arrangement: { style: 'grand', tonic: 'E3' },
});
