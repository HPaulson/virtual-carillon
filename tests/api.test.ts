import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from '../src/api/server.js';
import { routineMatches, westminsterAsset } from '../src/scheduling/schedule.js';

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
      preferredCanonicalHours: ['vespers'],
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

describe('audio delivery API', () => {
  it('advertises duration-friendly headers and serves byte ranges', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'virtual-carillon-api-'));
    const filePath = path.join(directory, 'hymn.wav');
    const audio = Buffer.from('RIFF test audio payload');
    let renderOptions: Record<string, unknown> | undefined;
    await writeFile(filePath, audio);
    const app = await createServer({
      engine: { defaultDistanceProfile: 'half-mile' },
      library: { list: () => [], resolveAndRender: async (_asset: string, options: Record<string, unknown>) => { renderOptions = options; return filePath; } },
      database: { recentEvents: () => [] },
    } as never);

    try {
      const full = await app.inject({ method: 'GET', url: '/api/assets/hymn/audio?distance=one-mile' });
      expect(full.statusCode).toBe(200);
      expect(full.headers['accept-ranges']).toBe('bytes');
      expect(full.headers['content-length']).toBe(String(audio.length));
      expect(full.rawPayload).toEqual(audio);
      expect(renderOptions).toEqual({ distance: 'one-mile' });

      const partial = await app.inject({
        method: 'GET',
        url: '/api/assets/hymn/audio',
        headers: { range: 'bytes=5-9' },
      });
      expect(partial.statusCode).toBe(206);
      expect(partial.headers['content-range']).toBe(`bytes 5-9/${audio.length}`);
      expect(partial.rawPayload).toEqual(audio.subarray(5, 10));
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('server-owned schedule API', () => {
  it('accepts and returns the simple public schedule vocabulary', async () => {
    let stored: { config: Record<string, unknown>; updatedAt: string } | undefined;
    const app = await createServer({
      engine: { defaultDistanceProfile: 'half-mile' },
      library: { list: () => [] },
      database: {
        recentEvents: () => [],
        getSchedule: () => stored,
        saveSchedule: (config: Record<string, unknown>) => {
          stored = { config, updatedAt: 'schedule-simple' };
          return stored;
        },
      },
    } as never);
    const schedule = {
      enabled: true,
      westminster: {
        enabled: true,
        cadence: 'hourly',
        weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        mediaPlayers: [],
        outputs: ['default'],
      },
      routines: [{
        id: 'angelus',
        name: 'Angelus',
        enabled: true,
        type: 'asset',
        asset: 'angelus',
        times: ['12:00', '18:00'],
        weekdays: ['mon', 'wed'],
        notBefore: '08:00',
        notAfter: '20:00',
        volume: 62,
        mediaPlayers: [],
        outputs: ['default'],
      }],
      litcal: { enabled: true, calendar: 'general' },
    };
    const saved = await app.inject({ method: 'PUT', url: '/api/schedule', payload: schedule });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().config).toEqual(schedule);
    expect((await app.inject({ method: 'GET', url: '/api/schedule' })).json().config).toEqual(schedule);
    expect((await app.inject({ method: 'GET', url: '/api/schedule/simple' })).json().config).toEqual(schedule);
    await app.close();
  });

  it('runs a simple schedule through native output without Home Assistant', async () => {
    let stored: { config: Record<string, unknown>; updatedAt: string } | undefined;
    const played: string[] = [];
    const claimed = new Set<string>();
    const app = await createServer({
      engine: { defaultDistanceProfile: 'half-mile' },
      library: {
        list: () => [],
        playAsset: async (asset: string) => {
          played.push(asset);
          return { filePath: `${asset}.wav`, command: 'test-player' };
        },
      },
      database: {
        recentEvents: () => [],
        getSchedule: () => stored,
        saveSchedule: (config: Record<string, unknown>) => {
          stored = { config, updatedAt: 'schedule-native' };
          return stored;
        },
        claimScheduleRun: (slotKey: string) => {
          if (claimed.has(slotKey)) return false;
          claimed.add(slotKey);
          return true;
        },
        completeScheduleRun: () => undefined,
        addEvent: () => undefined,
      },
    } as never);
    await app.inject({
      method: 'PUT',
      url: '/api/schedule',
      payload: {
        enabled: true,
        westminster: { enabled: false, cadence: 'hourly', weekdays: ['mon'], mediaPlayers: [], outputs: [] },
        routines: [{
          id: 'angelus', name: 'Angelus', enabled: true, type: 'asset', asset: 'angelus',
          times: ['12:00'], weekdays: ['mon'], mediaPlayers: [], outputs: [],
        }],
        litcal: { enabled: true, calendar: 'general' },
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/schedule/run',
      payload: { at: '2026-08-24T12:00:00-04:00' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().completed).toBe(true);
    expect(played).toEqual(['angelus']);
    await app.close();
  });

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
      westminster: {
        enabled: false,
        cadence: 'every_15',
        weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        mediaPlayers: [],
        outputs: [],
      },
      routines: [{
          id: 'afternoon-prayer',
        name: 'Afternoon prayer',
        enabled: true,
        trigger: { frequency: 'exact', time: '15:00', weekdays: ['mon'], excludedTimes: [], notBefore: '14:00', notAfter: '16:00' },
        actions: [
          { type: 'play', asset: 'westminster-hour-3', volume: 35, mediaPlayers: ['media_player.kitchen'], outputs: [] },
          { type: 'delay', seconds: 2 },
          { type: 'select_hymn', strategy: 'random', recentExclusion: 3, volume: 48, mediaPlayers: ['media_player.kitchen'], outputs: [] },
        ],
      }],
      litcal: { enabled: true, calendar: 'general' },
    };
    const saved = await app.inject({ method: 'PUT', url: '/api/schedule', payload: schedule });
    expect(saved.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/schedule' })).json().config).toEqual({
      enabled: true,
      westminster: schedule.westminster,
      litcal: schedule.litcal,
      routines: [{
        id: 'afternoon-prayer',
        name: 'Afternoon prayer',
        enabled: true,
        type: 'asset',
        asset: 'westminster-hour-3',
        times: ['15:00'],
        weekdays: ['mon'],
        notBefore: '14:00',
        notAfter: '16:00',
        volume: 35,
        mediaPlayers: ['media_player.kitchen'],
        outputs: [],
      }],
    });

    const first = await app.inject({ method: 'POST', url: '/api/schedule/claim', payload: { at: '2026-08-24T15:00:00-04:00' } });
    expect(first.statusCode).toBe(200);
    expect(first.json().actions.map((action: { asset: string }) => action.asset)).toEqual(['westminster-hour-3', 'hymn-to-joy']);
    expect(first.json().actions[0].waitAfterSeconds).toBe(2);
    expect(first.json().actions[1].mediaPlayers).toEqual(['media_player.kitchen']);
    expect(first.json().actions.map((action: { volume: number }) => action.volume)).toEqual([35, 48]);

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

  it('uses the actual hour for Westminster strikes', () => {
    const schedule = {
      enabled: true,
      cadence: 'every_15' as const,
      weekdays: ['mon' as const],
      mediaPlayers: ['media_player.kitchen'],
    };
    expect(westminsterAsset(schedule, { date: '2026-08-24', hour: 13, minute: 0, weekday: 1 })).toBe('westminster-hour-1');
    expect(westminsterAsset(schedule, { date: '2026-08-24', hour: 13, minute: 15, weekday: 1 })).toBe('westminster-quarter');
  });
});
