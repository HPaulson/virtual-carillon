import { describe, expect, it, vi } from 'vitest';
import { HymnCatalog } from '../src/library/catalog.js';
import { createLiturgicalTags } from '../src/liturgical/taxonomy.js';
import type { AssetDefinition } from '../src/library/library.js';
import type { LiturgicalDay } from '../src/liturgical/litcal.js';

const hymn = (id: string, tags: Parameters<typeof createLiturgicalTags>[0]): AssetDefinition => ({
  id, name: id, type: 'hymn', source: 'bundled', liturgicalTags: createLiturgicalTags(tags),
});

const assumptionDay: LiturgicalDay = {
  date: '2026-08-15', season: 'Ordinary Time', seasonIds: ['ordinary-time'], source: 'test',
  celebrations: [{
    key: 'Assumption', name: 'Assumption of the Blessed Virgin Mary', rank: 'SOLEMNITY', rankId: 'solemnity', grade: 6,
    liturgicalTags: createLiturgicalTags({ feasts: ['assumption-of-mary'], categories: ['marian'], seasons: ['general'] }),
  }],
};

const generalDay: LiturgicalDay = { date: '2026-08-16', season: undefined, seasonIds: [], celebrations: [], source: 'test' };

const saintDay: LiturgicalDay = {
  date: '2026-10-15', season: 'Ordinary Time', seasonIds: ['ordinary-time'], source: 'test',
  celebrations: [{
    key: 'StTeresaOfJesus', name: 'Saint Teresa of Jesus, virgin and doctor of the Church',
    rank: 'MEMORIAL', rankId: 'memorial', grade: 3,
    liturgicalTags: createLiturgicalTags({
      saints: ['st-teresa-of-jesus'], categories: ['saints', 'virgins', 'doctors'], seasons: ['ordinary-time'],
    }),
  }],
};

describe('feast-aware hymn catalog', () => {
  it('prefers an exact feast, then category, then season, then General', () => {
    const catalog = new HymnCatalog([
      hymn('general', { seasons: ['general'], categories: ['general'] }),
      hymn('seasonal', { seasons: ['ordinary-time'], categories: ['general'] }),
      hymn('marian', { seasons: ['general'], categories: ['marian'] }),
      hymn('assumption', { seasons: ['general'], feasts: ['assumption-of-mary'], categories: ['marian'] }),
    ]);
    expect(catalog.selectForDay(assumptionDay, { seed: 1 }).asset?.id).toBe('assumption');

    const noExact = new HymnCatalog([
      hymn('general', { seasons: ['general'], categories: ['general'] }),
      hymn('seasonal', { seasons: ['ordinary-time'], categories: ['general'] }),
      hymn('marian', { seasons: ['general'], categories: ['marian'] }),
    ]);
    expect(noExact.selectForDay(assumptionDay, { seed: 1 }).asset?.id).toBe('marian');

    const noCategory = new HymnCatalog([
      hymn('general', { seasons: ['general'], categories: ['general'] }),
      hymn('seasonal', { seasons: ['ordinary-time'], categories: ['ordinary-time'] }),
    ]);
    expect(noCategory.selectForDay(assumptionDay, { seed: 1 }).asset?.id).toBe('seasonal');
    expect(noCategory.selectForDay(generalDay, { seed: 1 }).asset?.id).toBe('general');
  });

  it('supports fixed, sequential, and seeded random strategies', () => {
    const assets = [
      hymn('first', { seasons: ['general'] }),
      hymn('second', { seasons: ['general'] }),
      hymn('third', { seasons: ['general'] }),
    ];
    const catalog = new HymnCatalog(assets);
    expect(catalog.selectForDay(generalDay, { strategy: 'fixed', fixedAssetId: 'second' }).asset?.id).toBe('second');
    expect(catalog.selectForDay(generalDay, { strategy: 'sequential' }).asset?.id).toBe('first');
    expect(catalog.selectForDay(generalDay, { strategy: 'sequential' }).asset?.id).toBe('second');
    expect(catalog.selectForDay(generalDay, { strategy: 'random', seed: 'test-seed' }).asset?.id)
      .toBe(catalog.selectForDay(generalDay, { strategy: 'random', seed: 'test-seed' }).asset?.id);
  });

  it('uses saint identity before saint type, then Ordinary Time', () => {
    const catalog = new HymnCatalog([
      hymn('ordinary', { seasons: ['ordinary-time'] }),
      hymn('doctor', { categories: ['saints', 'doctors'] }),
      hymn('teresa', { saints: ['st-teresa-of-jesus'] }),
    ]);
    expect(catalog.selectForDay(saintDay, { seed: 1 }).asset?.id).toBe('teresa');

    const withoutProper = new HymnCatalog([
      hymn('ordinary', { seasons: ['ordinary-time'] }),
      hymn('doctor', { categories: ['saints', 'doctors'] }),
    ]);
    expect(withoutProper.selectForDay(saintDay, { seed: 1 }).asset?.id).toBe('doctor');

    const withoutType = new HymnCatalog([hymn('ordinary', { seasons: ['ordinary-time'] })]);
    expect(withoutType.selectForDay(saintDay, { seed: 1 }).asset?.id).toBe('ordinary');
  });

  it('does not treat General as a category that outranks Ordinary Time', () => {
    const catalog = new HymnCatalog([
      hymn('general', { seasons: ['general'], categories: ['general'] }),
      hymn('ordinary', { seasons: ['ordinary-time'] }),
    ]);
    const day: LiturgicalDay = {
      date: '2026-08-17', season: 'Ordinary Time', seasonIds: ['ordinary-time'],
      celebrations: [{
        name: 'A celebration without a recognized theme', grade: 3,
        liturgicalTags: createLiturgicalTags({ categories: ['general'] }),
      }], source: 'test',
    };
    expect(catalog.selectForDay(day, { seed: 1 }).asset?.id).toBe('ordinary');
  });

  it('uses the requested office within the LitCal match tier', () => {
    const officeDay = assumptionDay;
    const categoryOffice = hymn('marian-lauds', {
      categories: ['marian'], canonicalHours: ['lauds'], seasons: ['general'],
    });
    const exactNoOffice = hymn('assumption-no-office', {
      feasts: ['assumption-of-mary'], categories: ['marian'], seasons: ['general'],
    });
    const catalog = new HymnCatalog([exactNoOffice, categoryOffice]);
    expect(catalog.selectForDay(officeDay, { preferredCanonicalHours: ['lauds'], seed: 1 }).asset?.id)
      .toBe('assumption-no-office');

    const noOffice = new HymnCatalog([exactNoOffice]);
    expect(noOffice.selectForDay(officeDay, { preferredCanonicalHours: ['lauds'], seed: 1 }).asset?.id)
      .toBe('assumption-no-office');
  });

  it('uses a canonical-hour theme when no hymn is tagged for that hour', () => {
    const laudsDay: LiturgicalDay = {
      date: '2026-08-18', season: undefined, seasonIds: [], celebrations: [], source: 'test',
    };
    const catalog = new HymnCatalog([
      hymn('ordinary', { categories: ['christological'] }),
      hymn('praise', { categories: ['praise'] }),
    ]);
    const selection = catalog.selectForDay(laudsDay, {
      preferredCanonicalHours: ['lauds'], seed: 1,
    });
    expect(selection.asset?.id).toBe('praise');
    expect(selection.scoring?.find((candidate) => candidate.id === 'praise')?.score).toBe(85);
    expect(selection.asset?.liturgicalTags?.canonicalHours).toEqual([]);
  });

  it('keeps feast and official-hour matches ahead of thematic matches', () => {
    const day: LiturgicalDay = {
      date: '2026-08-19', season: undefined, seasonIds: [], celebrations: [{
        name: 'Assumption', rank: 'SOLEMNITY', rankId: 'solemnity', grade: 6,
        liturgicalTags: createLiturgicalTags({ feasts: ['assumption-of-mary'] }),
      }], source: 'test',
    };
    const catalog = new HymnCatalog([
      hymn('theme', { categories: ['praise'] }),
      hymn('office', { canonicalHours: ['lauds'] }),
      hymn('feast', { feasts: ['assumption-of-mary'] }),
    ]);
    const selection = catalog.selectForDay(day, { preferredCanonicalHours: ['lauds'], seed: 1 });
    expect(selection.asset?.id).toBe('feast');
    expect(selection.scoring?.find((candidate) => candidate.id === 'office')?.score).toBe(90);
    expect(selection.scoring?.find((candidate) => candidate.id === 'theme')?.score).toBe(85);
  });

  it('supports the other canonical-hour themes without creating hour tags', () => {
    const day: LiturgicalDay = {
      date: '2026-08-20', season: undefined, seasonIds: [], celebrations: [], source: 'test',
    };
    for (const [hour, category] of [
      ['matins', 'contemplative'], ['daytime', 'passion'], ['vespers', 'thanksgiving'],
      ['compline', 'confidence'],
    ] as const) {
      const selection = new HymnCatalog([hymn(category, { categories: [category] })])
        .selectForDay(day, { preferredCanonicalHours: [hour], seed: 1 });
      expect(selection.asset?.id).toBe(category);
      expect(selection.asset?.liturgicalTags?.canonicalHours).toEqual([]);
    }
  });

  it('avoids the immediately previous random hymn when alternatives exist', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const catalog = new HymnCatalog([
      hymn('first', { seasons: ['general'] }),
      hymn('second', { seasons: ['general'] }),
    ]);
    const first = catalog.selectForDay(generalDay);
    const second = catalog.selectForDay(generalDay);
    expect(first.asset?.id).toBe('first');
    expect(second.asset?.id).toBe('second');
    vi.restoreAllMocks();
  });
});
