import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/audio/engine.js';
import { BUILTIN_HYMNS } from '../src/library/hymns.js';
import {
  LITURGICAL_CATEGORIES,
  LITURGICAL_FEASTS,
  LITURGICAL_OFFICES,
  LITURGICAL_SEASONS,
} from '../src/liturgical/taxonomy.js';
import {
  AssetLibrary,
  BUILTIN_ASSETS,
  WESTMINSTER_HOUR_FREQUENCY,
  WESTMINSTER_PHRASES,
} from '../src/library/library.js';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('authentic content model', () => {
  it('uses stable feast IDs and canonical-hour values in hymn metadata', () => {
    const feastIds = new Set(Object.keys(LITURGICAL_FEASTS));
    const categoryIds = new Set(Object.keys(LITURGICAL_CATEGORIES));
    const seasonIds = new Set(Object.keys(LITURGICAL_SEASONS));
    const hours = new Set(Object.keys(LITURGICAL_OFFICES));
    for (const hymn of BUILTIN_HYMNS) {
      for (const feast of hymn.liturgicalTags.feasts)
        expect(feastIds, `${hymn.id}: ${feast}`).toContain(feast);
      for (const category of hymn.liturgicalTags.categories)
        expect(categoryIds, `${hymn.id}: ${category}`).toContain(category);
      for (const season of hymn.liturgicalTags.seasons)
        expect(seasonIds, `${hymn.id}: ${season}`).toContain(season);
      for (const office of hymn.liturgicalTags.offices)
        expect(hours, `${hymn.id}: ${office}`).toContain(office);
      for (const hour of hymn.liturgicalTags.canonicalHours)
        expect(hours, `${hymn.id}: ${hour}`).toContain(hour);
      expect(hymn.liturgicalTags.solemnities, `${hymn.id}: hymn rank tags`).toEqual([]);
    }
    expect(
      BUILTIN_HYMNS.filter((hymn) => hymn.liturgicalTags.canonicalHours.length)
        .map((hymn) => hymn.id)
        .sort(),
    ).toEqual(
      [
        'alma-redemptoris-mater',
        'alma-redemptoris-mater-solemn',
        'aeterna-christi-munera',
        'ave-maris-stella',
        'ave-regina-caelorum',
        'ave-regina-caelorum-solemn',
        'regina-caeli',
        'regina-caeli-solemn',
        'rector-potens-verax-deus',
        'salve-regina',
        'salve-regina-solemn',
        'te-lucis-ante-terminum',
        'veni-creator-spiritus',
        'vexilla-regis',
        'christ-is-made-the-sure-foundation',
        'christe-redemptor-omnium',
        'creator-alme-siderum',
        'exsultet-caelum-laudibus',
        'exsultet-orbis-gaudiis',
        'o-fathers-of-our-ancient-faith',
        'sub-tuum-praesidium',
      ].sort(),
    );
  });

  it('registers the sourced seasonal hymn additions', () => {
    const ids = new Set(BUILTIN_HYMNS.map((hymn) => hymn.id));
    for (const id of [
      'joy-to-the-world',
      'o-come-all-ye-faithful',
      'away-in-a-manger',
      'in-the-bleak-midwinter',
      'hark-the-herald-angels-sing',
      'gloria-in-excelsis-deo',
      'god-rest-ye-merry-gentlemen',
      'gabriels-message',
      'come-thou-long-expected-jesus',
      'alma-redemptoris-mater',
      'psalm-51-miserere',
      'adoramus-te-christe',
      'adoro-te-devote',
      'o-sacred-head-now-wounded',
      'when-i-survey-the-wondrous-cross',
      'at-the-cross-her-station-keeping',
      'ave-de-lourdes',
      'come-holy-spirit',
      'o-god-beyond-all-praising',
      'regina-caeli',
      'christus-vincit',
      'anima-christi',
    ])
      expect(ids.has(id)).toBe(true);
    expect(
      BUILTIN_HYMNS.find((hymn) => hymn.id === 'in-the-bleak-midwinter')?.melody.notationFormat,
    ).toBe('abc');
    expect(
      BUILTIN_HYMNS.find((hymn) => hymn.id === 'at-the-cross-her-station-keeping')?.melody
        .notationFormat,
    ).toBe('abc');
    expect(BUILTIN_HYMNS.find((hymn) => hymn.id === 'ave-de-lourdes')?.melody.notationFormat).toBe(
      'abc',
    );
    expect(
      BUILTIN_HYMNS.find((hymn) => hymn.id === 'o-god-beyond-all-praising')?.melody.notationFormat,
    ).toBe('abc');
    expect(BUILTIN_HYMNS.find((hymn) => hymn.id === 'regina-caeli')?.melody.notationFormat).toBe(
      'abc',
    );
  });

  it('encodes all Westminster quarter phrases and separates the hour bell', () => {
    expect(WESTMINSTER_PHRASES.Q1).toEqual(['G#4', 'F#4', 'E4', 'B3']);
    expect(
      BUILTIN_ASSETS.find((asset) => asset.id === 'westminster-quarter')?.events?.every(
        (event) => event.distance === undefined && event.customDistance === undefined,
      ),
    ).toBe(true);
    expect(BUILTIN_ASSETS.find((asset) => asset.id === 'westminster-quarter')?.events).toHaveLength(
      4,
    );
    expect(BUILTIN_ASSETS.find((asset) => asset.id === 'westminster-half')?.events).toHaveLength(8);
    expect(
      BUILTIN_ASSETS.find((asset) => asset.id === 'westminster-three-quarter')?.events,
    ).toHaveLength(12);
    const hour = BUILTIN_ASSETS.find((asset) => asset.id === 'westminster-hour-12');
    expect(hour?.events).toHaveLength(28);
    expect(
      hour?.events
        ?.slice(-12)
        .every((event) => event.preset === 'clock-tower' && event.kind === 'strike'),
    ).toBe(true);
    expect(
      hour?.events?.slice(-12).every((event) => event.frequency === WESTMINSTER_HOUR_FREQUENCY),
    ).toBe(true);
    expect(
      hour?.events?.every(
        (event) => event.distance === undefined && event.customDistance === undefined,
      ),
    ).toBe(true);
    expect(WESTMINSTER_HOUR_FREQUENCY).toBeGreaterThan(130.81);
  });

  it('represents Angelus and Office entries as bell signals, not invented melodies', () => {
    const angelus = BUILTIN_ASSETS.find((asset) => asset.id === 'angelus');
    expect(angelus?.contentKind).toBe('traditional');
    expect(angelus?.sourceUrl).toContain('angelus-bell');
    expect(angelus?.events).toHaveLength(9);
    expect(new Set(angelus?.events?.map((event) => event.frequency)).size).toBe(1);
    for (const id of [
      'divine-office-matins',
      'divine-office-lauds',
      'divine-office-vespers',
      'divine-office-compline',
    ]) {
      const office = BUILTIN_ASSETS.find((asset) => asset.id === id);
      expect(office?.contentKind).toBe('signal');
      expect(office?.events?.every((event) => event.kind === 'strike')).toBe(true);
    }
  });

  it('renders the bundled hymn library and imports user recordings', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'carillon-content-'));
    const source = path.join(directory, 'local-angelus.wav');
    await writeFile(source, Buffer.from('RIFF-placeholder'));
    const library = new AssetLibrary(
      new AudioEngine(path.join(directory, 'cache'), 8000),
      path.join(directory, 'cache'),
      path.join(directory, 'assets'),
    );
    const hymns = library.list().filter((asset) => asset.type === 'hymn');
    expect(hymns.length).toBeGreaterThanOrEqual(5);
    expect(
      hymns.every(
        (asset) => asset.liturgicalTags?.categories.length && asset.liturgicalTags.seasons.length,
      ),
    ).toBe(true);
    expect(
      hymns.find((asset) => asset.id === 'veni-creator-spiritus')?.liturgicalTags?.categories,
    ).toEqual(expect.arrayContaining(['holy-spirit']));
    expect(hymns.find((asset) => asset.id === 'pange-lingua')?.liturgicalTags?.feasts).toEqual(
      expect.arrayContaining(['corpus-christi', 'holy-thursday']),
    );
    const imported = await library.importRecording({
      name: 'My Local Angelus',
      sourcePath: source,
      tags: ['Angelus', 'Recording'],
    });
    expect(imported.source).toBe('user');
    expect(library.list().some((asset) => asset.id === imported.id)).toBe(true);
    expect(await library.resolveAndRender(imported.id)).toContain(imported.id);
  });
});
