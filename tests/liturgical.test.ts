import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiturgicalCalendarClient } from '../src/liturgical/litcal.js';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('optional LitCal integration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is offline-safe when disabled', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const client = new LiturgicalCalendarClient({ enabled: false, cacheDir: await mkdtemp(path.join(os.tmpdir(), 'litcal-')) });
    expect(await client.getDay('2026-08-23')).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches a civil-year calendar and caches normalized feast data', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-'));
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ litcal: [{ date: '2026-08-23', season: 'Ordinary Time', events: [{ event_key: 'feria', name: 'A weekday celebration', grade: 1, color: ['green'] }, { event_key: 'Sunday', name: 'Twenty-first Sunday in Ordinary Time', grade: 6, rank: 'SUNDAY', color: ['green'] }] }] }) });
    vi.stubGlobal('fetch', fetch);
    const client = new LiturgicalCalendarClient({ enabled: true, cacheDir: directory, baseUrl: 'https://example.test/api/v5' });
    const day = await client.getDay('2026-08-23');
    expect(day?.season).toBe('Ordinary Time');
    expect(day?.celebrations[0].name).toContain('Twenty-first');
    expect(day?.primaryCelebration?.grade).toBe(6);
    expect(day?.primaryCelebration?.liturgicalTags.categories).toContain('sunday');
    expect(fetch).toHaveBeenCalledWith('https://example.test/api/v5/calendar/2026?year_type=CIVIL', expect.anything());
    const cached = new LiturgicalCalendarClient({ enabled: true, cacheDir: directory, baseUrl: 'https://example.test/api/v5' });
    expect((await cached.getDay('2026-08-23'))?.celebrations[0].rank).toBe('SUNDAY');
  });
});
