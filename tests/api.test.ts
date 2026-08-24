import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../src/api/server.js';
import { routineMatches } from '../src/scheduling/schedule.js';

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

describe('server-owned schedule API', () => {
  it('persists arbitrary routines and claims their ordered actions once', async () => {
    let stored: { config: Record<string, unknown>; updatedAt: string } | undefined;
    const claimed = new Set<string>();
    const app = await createServer({
      engine: { defaultDistanceProfile: 'half-mile' },
      library: {
        list: () => [],
      },
      database: {
        recentEvents: () => [],
        getSchedule: () => stored,
        saveSchedule: (config: Record<string, unknown>) => {
          stored = { config, updatedAt: 'schedule-1' };
          return stored;
        },
        claimScheduleRun: (slotKey: string) => {
          if (claimed.has(slotKey)) return false;
          claimed.add(slotKey);
          return true;
        },
        completeScheduleRun: () => undefined,
      },
      liturgicalCalendar: { getDay: async () => ({ date: '2026-08-24', season: 'Ordinary Time', seasonIds: ['ordinary-time'], celebrations: [], source: 'test' }) },
      hymnCatalog: {
        selectForDay: () => ({ asset: { id: 'hymn-to-joy' }, candidates: [], matchedBy: 'season' }),
      },
    } as never);

    const schedule = {
      enabled: true,
      routines: [{
        id: 'afternoon-prayer',
        name: 'Afternoon prayer',
        enabled: true,
        trigger: { frequency: 'exact', time: '15:00', weekdays: ['mon'], excludedTimes: [], notBefore: '14:00', notAfter: '16:00' },
        actions: [
          { type: 'play', asset: 'westminster-hour-3', mediaPlayers: ['media_player.kitchen'] },
          { type: 'delay', seconds: 2 },
          { type: 'select_hymn', strategy: 'random', recentExclusion: 3, mediaPlayers: ['media_player.kitchen'] },
        ],
      }],
      litcal: { enabled: true, calendar: 'general' },
    };
    const saved = await app.inject({ method: 'PUT', url: '/api/schedule', payload: schedule });
    expect(saved.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/schedule' })).json().config).toEqual(schedule);

    const first = await app.inject({ method: 'POST', url: '/api/schedule/claim', payload: { at: '2026-08-24T15:00:00-04:00' } });
    expect(first.statusCode).toBe(200);
    expect(first.json().actions.map((action: { asset: string }) => action.asset)).toEqual(['westminster-hour-3', 'hymn-to-joy']);
    expect(first.json().actions[0].waitAfterSeconds).toBe(2);
    expect(first.json().actions[1].mediaPlayers).toEqual(['media_player.kitchen']);

    const second = await app.inject({ method: 'POST', url: '/api/schedule/claim', payload: { at: '2026-08-24T15:00:00-04:00' } });
    expect(second.json().claimed).toBe(false);
    expect(second.json().actions).toEqual([]);
    const outsideWindow = await app.inject({ method: 'POST', url: '/api/schedule/claim', payload: { at: '2026-08-24T17:00:00-04:00' } });
    expect(outsideWindow.json()).toEqual({ due: false, actions: [] });
    await app.close();
  });

  it('supports an allowed window that crosses midnight', () => {
    const routine = {
      id: 'overnight',
      name: 'Overnight',
      enabled: true,
      trigger: {
        frequency: 'hourly' as const,
        time: '12:00',
        weekdays: ['mon' as const],
        excludedTimes: [],
        notBefore: '22:00',
        notAfter: '06:00',
      },
      actions: [{ type: 'delay' as const, seconds: 1 }],
    };
    expect(routineMatches(routine, { date: '2026-08-24', hour: 23, minute: 0, weekday: 1 })).toBe(true);
    expect(routineMatches(routine, { date: '2026-08-25', hour: 5, minute: 0, weekday: 2 })).toBe(true);
    expect(routineMatches(routine, { date: '2026-08-25', hour: 12, minute: 0, weekday: 2 })).toBe(false);
  });
});
