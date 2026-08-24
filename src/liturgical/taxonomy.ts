export const LITURGICAL_SEASONS = {
  general: 'General',
  advent: 'Advent',
  christmas: 'Christmas',
  epiphany: 'Epiphany',
  lent: 'Lent',
  'holy-week': 'Holy Week',
  // Includes the Easter Octave; LitCal days in the octave normalize here too.
  easter: 'Easter',
  'ordinary-time': 'Ordinary Time',
} as const;

export const LITURGICAL_CATEGORIES = {
  general: 'General',
  marian: 'Marian',
  saints: 'Saints',
  christological: 'Christological',
  eucharistic: 'Eucharistic',
  'holy-spirit': 'Holy Spirit',
  passion: 'Passion',
  resurrection: 'Resurrection',
  angels: 'Angels',
  apostles: 'Apostles',
  martyrs: 'Martyrs',
  virgins: 'Virgins',
  doctors: 'Doctors',
  religious: 'Religious',
  praise: 'Praise',
  thanksgiving: 'Thanksgiving',
  confidence: 'Confidence in God',
  contemplative: 'Contemplative',
  incarnation: 'Incarnation',
  penitential: 'Penitential',
  psalm: 'Psalm',
} as const;

export const LITURGICAL_FEASTS = {
  annunciation: 'Annunciation',
  'assumption-of-mary': 'Assumption of Mary',
  'nativity-of-mary': 'Nativity of Mary',
  'purification-of-the-lord': 'Presentation / Purification of the Lord',
  'immaculate-conception': 'Immaculate Conception',
  'mary-mother-of-god': 'Mary, Mother of God',
  visitation: 'Visitation',
  'queenship-of-mary': 'Queenship of Mary',
  'our-lady-of-sorrows': 'Our Lady of Sorrows',
  'our-lady-of-lourdes': 'Our Lady of Lourdes',
  'christ-the-king': 'Our Lord Jesus Christ, King of the Universe',
  'ash-wednesday': 'Ash Wednesday',
  'epiphany-of-the-lord': 'Epiphany of the Lord',
  'nativity-of-the-lord': 'Nativity of the Lord',
  'baptism-of-the-lord': 'Baptism of the Lord',
  'ascension-of-the-lord': 'Ascension of the Lord',
  pentecost: 'Pentecost',
  'trinity-sunday': 'Trinity Sunday',
  'corpus-christi': 'Corpus Christi',
  'sacred-heart-of-jesus': 'Sacred Heart of Jesus',
  'holy-thursday': 'Holy Thursday',
  'good-friday': 'Good Friday',
  'exaltation-of-the-holy-cross': 'Exaltation of the Holy Cross',
  'all-saints': 'All Saints',
  'all-souls': 'All Souls',
  'dedication-of-a-church': 'Dedication of a Church',
} as const;

export type LiturgicalSeasonId = keyof typeof LITURGICAL_SEASONS;
export type LiturgicalSeasonName = (typeof LITURGICAL_SEASONS)[LiturgicalSeasonId];
export type LiturgicalSeasonInput = LiturgicalSeasonId | LiturgicalSeasonName;
export type LiturgicalCategoryId = keyof typeof LITURGICAL_CATEGORIES;
export type LiturgicalFeastId = keyof typeof LITURGICAL_FEASTS;
export const LITURGICAL_OFFICES = {
  matins: 'Matins',
  lauds: 'Lauds',
  daytime: 'Daytime',
  vespers: 'Vespers',
  compline: 'Compline',
} as const;
export type LiturgicalOfficeId = keyof typeof LITURGICAL_OFFICES;
export type LiturgicalOfficeName = (typeof LITURGICAL_OFFICES)[LiturgicalOfficeId];
export type LiturgicalOfficeInput = LiturgicalOfficeId | LiturgicalOfficeName;
export type LiturgicalRankId =
  | 'feria'
  | 'commemoration'
  | 'optional-memorial'
  | 'memorial'
  | 'feast'
  | 'feast-of-the-lord'
  | 'solemnity'
  | 'higher-solemnity';

export interface LiturgicalTags {
  seasons: LiturgicalSeasonId[];
  feasts: LiturgicalFeastId[];
  solemnities: LiturgicalFeastId[];
  memorials: LiturgicalFeastId[];
  saints: string[];
  categories: LiturgicalCategoryId[];
  offices: LiturgicalOfficeId[];
  canonicalHours: LiturgicalOfficeId[];
}

export const EMPTY_LITURGICAL_TAGS: LiturgicalTags = {
  seasons: [],
  feasts: [],
  solemnities: [],
  memorials: [],
  saints: [],
  categories: [],
  offices: [],
  canonicalHours: [],
};

export function createLiturgicalTags(input: Partial<LiturgicalTags> = {}): LiturgicalTags {
  return {
    seasons: unique(input.seasons),
    feasts: unique(input.feasts),
    solemnities: unique(input.solemnities),
    memorials: unique(input.memorials),
    saints: unique(input.saints),
    categories: unique(input.categories),
    offices: unique(input.offices),
    canonicalHours: unique(input.canonicalHours),
  };
}

export function inferLiturgicalTags(input: {
  key?: string;
  name?: string;
  season?: string;
  grade?: number;
  rank?: string;
  common?: string[];
  tags?: string[];
  feastTypes?: string[];
  liturgicalSeasons?: string[];
}): LiturgicalTags {
  const text = normalise(
    [
      input.key,
      input.name,
      input.rank,
      ...(input.common ?? []),
      ...(input.tags ?? []),
      ...(input.feastTypes ?? []),
    ]
      .filter(Boolean)
      .join(' '),
  );
  const tags = createLiturgicalTags({
    seasons: [seasonId(input.season)],
    categories: [],
    feasts: [],
  });
  for (const season of input.liturgicalSeasons ?? []) tags.seasons.push(seasonId(season));
  const addCategory = (...values: LiturgicalCategoryId[]) => tags.categories.push(...values);
  const addFeast = (...values: LiturgicalFeastId[]) => tags.feasts.push(...values);
  const addSaint = (...values: string[]) => tags.saints.push(...values);
  const addSeason = (value: LiturgicalSeasonId) => tags.seasons.push(value);

  // LitCal does not expose a stable project-level saint taxonomy. Preserve a
  // deterministic identity when the event looks like a saint celebration so
  // a future/proper hymn can opt into it, while category inference still
  // provides a useful fallback for obscure saints.
  if (isSaintCelebration(text)) {
    const saintId = stableSaintId(input.key, input.name);
    if (saintId) addSaint(saintId);
    addCategory('saints');
  }

  if (text.includes('assumption')) {
    addFeast('assumption-of-mary');
    addCategory('marian');
  }
  if (text.includes('nativity') && (text.includes('mary') || text.includes('virgin'))) {
    addFeast('nativity-of-mary');
    addCategory('marian');
  }
  if (text.includes('immaculate conception')) {
    addFeast('immaculate-conception');
    addCategory('marian');
  }
  if (text.includes('annunciation')) {
    addFeast('annunciation');
    addCategory('marian');
  }
  if (text.includes('mother of god') || text.includes('theotokos')) {
    addFeast('mary-mother-of-god');
    addCategory('marian');
  }
  if (text.includes('visitation')) {
    addFeast('visitation');
    addCategory('marian');
  }
  if (text.includes('queenship of mary')) {
    addFeast('queenship-of-mary');
    addCategory('marian');
  }
  if (
    text.includes('our lady') ||
    text.includes('blessed virgin') ||
    text.includes('virgin mary') ||
    text.includes('mary')
  )
    addCategory('marian');

  if (text.includes('corpus christi')) {
    addFeast('corpus-christi');
    addCategory('eucharistic', 'christological');
  }
  if (text.includes('holy thursday')) {
    addFeast('holy-thursday');
    addCategory('eucharistic', 'passion');
  }
  if (text.includes('sacred heart')) {
    addFeast('sacred-heart-of-jesus');
    addCategory('christological');
  }
  if (text.includes('holy spirit') || text.includes('pentecost')) {
    addFeast('pentecost');
    addCategory('holy-spirit');
  }
  if (text.includes('trinity')) {
    addFeast('trinity-sunday');
    addCategory('christological');
  }
  if (text.includes('ascension')) {
    addFeast('ascension-of-the-lord');
    addCategory('christological');
  }
  if (text.includes('resurrection') || text.includes('easter')) {
    addCategory('resurrection', 'christological');
    addSeason('easter');
  }
  if (
    text.includes('exaltation of the holy cross') ||
    text.includes('good friday') ||
    text.includes('passion') ||
    text.includes('cross')
  )
    addCategory('passion', 'christological');
  if (text.includes('epiphany')) {
    addFeast('epiphany-of-the-lord');
    addCategory('christological');
    addSeason('epiphany');
  }
  if (text.includes('nativity of the lord') || text.includes('christmas')) {
    addFeast('nativity-of-the-lord');
    addCategory('christological');
    addSeason('christmas');
  }
  if (text.includes('all saints')) {
    addFeast('all-saints');
  }
  if (text.includes('all souls')) {
    addFeast('all-souls');
  }
  if (text.includes('angel')) addCategory('angels');
  if (text.includes('apostle')) addCategory('apostles');
  if (text.includes('martyr')) addCategory('martyrs');
  if (text.includes('virgin')) addCategory('virgins');
  if (text.includes('doctor')) addCategory('doctors');
  if (text.includes('religious') || text.includes('abbot') || text.includes('monk'))
    addCategory('religious');
  if (text.includes('dedication')) {
    addFeast('dedication-of-a-church');
  }
  if (!tags.categories.length) addCategory('general');

  const rank = rankId(input.grade, input.rank);
  if (rank === 'solemnity' || rank === 'higher-solemnity') tags.solemnities.push(...tags.feasts);
  if (rank === 'memorial' || rank === 'optional-memorial') tags.memorials.push(...tags.feasts);
  return createLiturgicalTags(tags);
}

function isSaintCelebration(text: string): boolean {
  return /(^| )(saint|saints|st |sts |san |santa |santo |sancti|beatus|blessed )/.test(text);
}

function stableSaintId(key?: string, name?: string): string | undefined {
  const value = key || name;
  if (!value) return undefined;
  const id = value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return id || undefined;
}

export function seasonId(value?: string): LiturgicalSeasonId {
  const text = normalise(value ?? '');
  if (text.includes('advent')) return 'advent';
  if (text.includes('christmas')) return 'christmas';
  if (text.includes('epiphany')) return 'epiphany';
  if (text.includes('lent')) return 'lent';
  if (text.includes('holy week')) return 'holy-week';
  if (text.includes('easter')) return 'easter';
  if (text.includes('ordinary')) return 'ordinary-time';
  return 'general';
}

export function rankId(grade?: number, label?: string): LiturgicalRankId {
  if (grade !== undefined)
    return ([
      'feria',
      'commemoration',
      'optional-memorial',
      'memorial',
      'feast',
      'feast-of-the-lord',
      'solemnity',
      'higher-solemnity',
    ][Math.max(0, Math.min(7, grade))] ?? 'feria') as LiturgicalRankId;
  const text = normalise(label ?? '');
  if (text.includes('solemn')) return 'solemnity';
  if (text.includes('feast')) return 'feast';
  if (text.includes('optional')) return 'optional-memorial';
  if (text.includes('memorial')) return 'memorial';
  return 'feria';
}

export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[·'’_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function unique<T>(values: T[] | undefined): T[] {
  return [...new Set(values ?? [])];
}
