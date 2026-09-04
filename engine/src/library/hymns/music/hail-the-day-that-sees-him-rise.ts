import { defineHymn } from '../defineHymn.js';
import { easterHymnNotation } from '../notation/tunes/easter-hymn.js';

export const hailTheDayThatSeesHimRise = defineHymn({
  id: 'hail-the-day-that-sees-him-rise',
  name: 'Hail the Day That Sees Him Rise (EASTER HYMN)',
  liturgical: {
    categories: ['christological'],
    seasons: ['Easter'],
    offices: [],
    feasts: ['ascension-of-the-lord'],
  },
  notation: easterHymnNotation,
  arrangement: { style: 'celebratory', tonic: 'C3' },
});
