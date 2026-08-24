import { defineHymn } from '../defineHymn.js';
import { easterHymnNotation } from '../notation/tunes/easter-hymn.js';

export const hailTheDayThatSeesHimRise = defineHymn({
  id: 'hail-the-day-that-sees-him-rise',
  name: 'Hail the Day That Sees Him Rise (EASTER HYMN)',
  source: 'Traditional tune EASTER HYMN, Lyra Davidica (1708), used for Ascension hymnody',
  sourceUrl:
    'https://abcnotation.com/tunePage?a=pghardy.net%2Ftunebooks%2Fpgh_songs_tunebook%2F0007',
  license: 'Public-domain melody; ABC source transcription credited in this asset',
  tags: ['Hymn', 'Ascension'],
  liturgical: {
    categories: ['ascension', 'christological'],
    seasons: ['Ascension'],
    offices: [],
    feasts: ['ascension-of-the-lord'],
    solemnities: [],
  },
  notation: easterHymnNotation,
  arrangement: { style: 'celebratory', tonic: 'C3' },
});
