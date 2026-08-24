import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiturgicalCalendarClient } from '../src/liturgical/litcal.js';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('LitCal integration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches a civil-year calendar and caches normalized feast data', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-'));
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ litcal: [{ date: '2026-08-23', season: 'Ordinary Time', events: [{ event_key: 'feria', name: 'A weekday celebration', grade: 1, color: ['green'] }, { event_key: 'Sunday', name: 'Twenty-first Sunday in Ordinary Time', grade: 6, rank: 'SUNDAY', color: ['green'] }] }] }) });
    vi.stubGlobal('fetch', fetch);
    const client = new LiturgicalCalendarClient({ cacheDir: directory, baseUrl: 'https://example.test/api/v5' });
    const day = await client.getDay('2026-08-23');
    expect(day?.season).toBe('Ordinary Time');
    expect(day?.celebrations[0].name).toContain('Twenty-first');
    expect(day?.primaryCelebration?.grade).toBe(6);
    expect(day?.primaryCelebration?.liturgicalTags.categories).toContain('general');
    expect(fetch).toHaveBeenCalledWith('https://example.test/api/v5/calendar/2026?year_type=CIVIL', expect.anything());
    const cached = new LiturgicalCalendarClient({ cacheDir: directory, baseUrl: 'https://example.test/api/v5' });
    expect((await cached.getDay('2026-08-23'))?.celebrations[0].rank).toBe('SUNDAY');
  });

  it('keeps the Easter season continuous through the octave', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-easter-'));
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ litcal: [{ date: '2026-04-05', season: 'Easter', events: [{ event_key: 'easter', name: 'Easter Sunday', grade: 7 }] }, { date: '2026-04-06', season: 'Easter Octave', events: [{ event_key: 'monday-in-the-octave-of-easter', name: 'Monday in the Octave of Easter', grade: 4 }] }] }) });
    vi.stubGlobal('fetch', fetch);
    const client = new LiturgicalCalendarClient({ cacheDir: directory, baseUrl: 'https://example.test/api/v5' });
    const sunday = await client.getDay('2026-04-05');
    const octave = await client.getDay('2026-04-06');
    expect(sunday?.seasonIds).toContain('easter');
    expect(octave?.seasonIds).toContain('easter');
    expect(octave?.primaryCelebration?.liturgicalTags.feasts).toEqual([]);
  });
});
