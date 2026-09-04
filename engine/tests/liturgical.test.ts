import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiturgicalCalendarClient } from '../src/liturgical/litcal.js';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('LitCal integration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches a civil-year calendar and caches normalized feast data', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-'));
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        litcal: [
          {
            date: '2026-08-23',
            season: 'Ordinary Time',
            events: [
              { event_key: 'feria', name: 'A weekday celebration', grade: 1, color: ['green'] },
              {
                event_key: 'Sunday',
                name: 'Twenty-first Sunday in Ordinary Time',
                grade: 6,
                rank: 'SUNDAY',
                color: ['green'],
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetch);
    const client = new LiturgicalCalendarClient({
      cacheDir: directory,
      baseUrl: 'https://example.test/api/v5',
    });
    const day = await client.getDay('2026-08-23');
    expect(day?.season).toBe('Ordinary Time');
    expect(day?.celebrations[0].name).toContain('Twenty-first');
    expect(day?.primaryCelebration?.grade).toBe(6);
    expect(day?.primaryCelebration?.liturgicalTags.categories).toContain('general');
    expect(fetch).toHaveBeenCalledWith(
      'https://example.test/api/v5/calendar/2026?year_type=CIVIL&locale=en',
      expect.anything(),
    );
    const cached = new LiturgicalCalendarClient({
      cacheDir: directory,
      baseUrl: 'https://example.test/api/v5',
    });
    expect((await cached.getDay('2026-08-23'))?.celebrations[0].rank).toBe('SUNDAY');
  });

  it('keeps the Easter season continuous through the octave', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-easter-'));
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        litcal: [
          {
            date: '2026-04-05',
            season: 'Easter',
            events: [{ event_key: 'easter', name: 'Easter Sunday', grade: 7 }],
          },
          {
            date: '2026-04-06',
            season: 'Easter Octave',
            events: [
              {
                event_key: 'monday-in-the-octave-of-easter',
                name: 'Monday in the Octave of Easter',
                grade: 4,
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetch);
    const client = new LiturgicalCalendarClient({
      cacheDir: directory,
      baseUrl: 'https://example.test/api/v5',
    });
    const sunday = await client.getDay('2026-04-05');
    const octave = await client.getDay('2026-04-06');
    expect(sunday?.seasonIds).toContain('easter');
    expect(octave?.seasonIds).toContain('easter');
    expect(octave?.primaryCelebration?.liturgicalTags.feasts).toEqual([]);
  });

  it('preserves martyr categories supplied through LitCal feast_type', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-martyr-'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          litcal: [
            {
              date: '2026-06-05',
              events: [
                {
                  event_key: 'StBoniface',
                  name: 'Saint Boniface, Bishop',
                  grade: 3,
                  feast_type: 'Martyr',
                },
              ],
            },
          ],
        }),
      }),
    );
    const client = new LiturgicalCalendarClient({ cacheDir: directory });
    const day = await client.getDay('2026-06-05');
    expect(day?.primaryCelebration?.liturgicalTags.categories).toContain('martyrs');
  });

  it('maps LitCal common labels across saint attribute families', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-common-'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          litcal: [
            {
              date: '2026-08-11',
              events: [
                {
                  event_key: 'StClare',
                  name: 'Sanctae Clarae, virginis',
                  grade: 3,
                  common: ['Virgins:For One Virgin', 'Holy Men and Women:For a Nun'],
                },
              ],
            },
          ],
        }),
      }),
    );
    const client = new LiturgicalCalendarClient({ cacheDir: directory });
    const day = await client.getDay('2026-08-11');
    expect(day?.primaryCelebration?.liturgicalTags.categories).toEqual(
      expect.arrayContaining(['saints', 'virgins', 'religious']),
    );
  });

  it('retains LitCal scoring attributes and maps every common family', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'litcal-attributes-'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          litcal: [
            {
              event_key: 'StExample',
              event_idx: 123,
              name: 'Saint Example, Bishop and Martyr',
              color: ['red', 'white'],
              color_lcl: ['red', 'white'],
              grade: 3,
              grade_lcl: 'Memorial',
              grade_abbr: 'M',
              common: [
                'Pastors:For a Bishop',
                'Pastors:For Missionaries',
                'Holy Men and Women:For Educators',
                'Holy Men and Women:For Those Who Practiced Works of Mercy',
                'Holy Men and Women:For Holy Women',
              ],
              common_lcl: 'From the Common of Pastors',
              type: 'fixed',
              date: '2026-06-05T00:00:00+00:00',
              readings: { first_reading: 'Example 1:1', gospel: 'Example 2:2' },
              liturgical_year: 'YEAR II',
              psalter_week: 2,
              liturgical_season: 'ORDINARY_TIME',
              liturgical_season_lcl: 'Ordinary Time',
              is_vigil_mass: true,
              is_vigil_for: 'Example',
              has_vigil_mass: true,
              has_vesper_i: false,
              has_vesper_ii: true,
              holy_day_of_obligation: true,
            },
          ],
        }),
      }),
    );
    const client = new LiturgicalCalendarClient({ cacheDir: directory });
    const celebration = (await client.getDay('2026-06-05'))?.primaryCelebration;
    expect(celebration).toMatchObject({
      eventIndex: 123,
      rankAbbreviation: 'M',
      colors: ['red', 'white'],
      eventType: 'fixed',
      feastType: undefined,
      common: expect.arrayContaining(['Pastors:For a Bishop']),
      readings: { first_reading: 'Example 1:1', gospel: 'Example 2:2' },
      liturgicalYear: 'YEAR II',
      psalterWeek: 2,
      isVigilMass: true,
      isVigilFor: 'Example',
      hasVigilMass: true,
      hasVesperI: false,
      hasVesperII: true,
      holyDayOfObligation: true,
    });
    expect(celebration?.liturgicalTags.categories).toEqual(
      expect.arrayContaining([
        'saints',
        'martyrs',
        'pastors',
        'missionaries',
        'educators',
        'works-of-mercy',
        'holy-women',
      ]),
    );
  });
});
