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
    liturgicalTags: createLiturgicalTags({ feasts: ['assumption-of-mary'], categories: ['marian', 'blessed-virgin-mary'], seasons: ['general'] }),
  }],
};

const generalDay: LiturgicalDay = { date: '2026-08-16', season: undefined, seasonIds: [], celebrations: [], source: 'test' };

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
