import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/audio/engine.js';
import { BUILTIN_HYMNS } from '../src/library/hymns.js';
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
    expect(WESTMINSTER_PHRASES.Q1).toEqual(['E4', 'D4', 'C4', 'G3']);
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
      hymns.every(
        (asset) =>
          !asset.tags.some((tag) =>
            ['English', 'Latin', 'Spanish', 'Welsh', 'Anglican'].includes(tag),
          ),
      ),
    ).toBe(true);
    expect(
      hymns.find((asset) => asset.id === 'veni-creator-spiritus')?.liturgicalTags?.categories,
    ).toEqual(expect.arrayContaining(['holy-spirit', 'pentecost', 'confirmation', 'ordination']));
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
