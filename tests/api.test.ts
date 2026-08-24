import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../src/api/server.js';

describe('selection API', () => {
  let app: Awaited<ReturnType<typeof createServer>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('accepts the complete HA liturgical selection query', async () => {
    let receivedQuery: Record<string, unknown> | undefined;
    const celebration = {
      name: 'Test Solemnity',
      rank: 'SOLEMNITY',
      rankId: 'solemnity',
      liturgicalTags: {
        seasons: ['advent'],
        feasts: ['test-feast'],
        categories: ['marian'],
        offices: ['vespers'],
        canonicalHours: ['vespers'],
        solemnities: [],
        memorials: [],
      },
    };
    const day = {
      date: '2026-08-24',
      season: 'Advent',
      seasonIds: ['advent'],
      celebrations: [celebration],
      primaryCelebration: celebration,
      source: 'test',
    };
    app = await createServer({
      engine: { defaultDistanceProfile: 'half-mile' },
      library: { list: () => [] },
      database: { recentEvents: () => [] },
      liturgicalCalendar: { getDay: async () => day },
      hymnCatalog: {
        selectForDay: (_day: unknown, query: Record<string, unknown>) => {
          receivedQuery = query;
          return { asset: { id: 'test-hymn' }, candidates: [], matchedBy: 'fixed' };
        },
      },
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/hymns/select',
      payload: {
        date: '2026-08-24',
        seasons: ['advent'],
        rank: 'solemnity',
        feastIds: ['test-feast'],
        categoryIds: ['marian'],
        offices: ['vespers'],
        canonicalHours: ['vespers'],
        tags: ['seasonal'],
        strategy: 'fixed',
        fixedAssetId: 'test-hymn',
        seed: 'noon',
        recentExclusion: 3,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().selection.asset.id).toBe('test-hymn');
    expect(receivedQuery).toMatchObject({
      seasonIds: ['advent'],
      feastIds: ['test-feast'],
      categoryIds: ['marian'],
      officeIds: ['vespers'],
      canonicalHours: ['vespers'],
      tags: ['seasonal'],
      strategy: 'fixed',
      fixedAssetId: 'test-hymn',
      seed: 'noon',
      recentExclusion: 3,
    });
  });

  it('selects against a neutral day when HA disables LitCal', async () => {
    app = await createServer({
      engine: { defaultDistanceProfile: 'half-mile' },
      library: { list: () => [] },
      database: { recentEvents: () => [] },
      hymnCatalog: {
        selectForDay: (day: { source: string }, query: Record<string, unknown>) => ({
          asset: { id: query.fixedAssetId as string },
          candidates: [],
          matchedBy: 'fixed',
          celebration: day.source,
        }),
      },
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/hymns/select',
      payload: { useLitCal: false, strategy: 'fixed', fixedAssetId: 'hymn-to-joy' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().day.source).toBe('home-assistant-disabled');
    expect(response.json().selection.asset.id).toBe('hymn-to-joy');
  });
});
