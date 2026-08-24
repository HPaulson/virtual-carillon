import { defineHymn } from '../defineHymn.js';
import { veniCreatorNotation } from '../notation/tunes/veni-creator.js';

export const comeHolySpirit = defineHymn({
  id: 'come-holy-spirit',
  name: 'Come, Holy Spirit (VENI CREATOR)',
  source: 'Veni Creator Spiritus, traditional Gregorian hymn; English title Come, Holy Spirit',
  sourceUrl: 'https://en.gregorianum.org/index.php?title=Veni_Creator_Spiritus',
  license: 'Public-domain chant; source GABC and English title pairing credited in this asset',
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
