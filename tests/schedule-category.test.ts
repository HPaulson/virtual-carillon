import { describe, expect, it } from 'vitest';
import { normalizeSchedule, toSimpleSchedule } from '../src/scheduling/schedule.js';

describe('category hymn schedules', () => {
  it('round-trips a category collection with an optional canonical hour', () => {
    const config = normalizeSchedule({
      enabled: true,
      westminster: { enabled: false, cadence: 'hourly', weekdays: ['sun'], mediaPlayers: [], outputs: [] },
      routines: [{
        id: 'angelus-marian',
        name: 'Marian Angelus hymn',
        enabled: true,
        type: 'hymn_category',
        categoryIds: ['marian'],
        canonicalHour: 'lauds',
        times: ['12:00'],
        weekdays: ['sun'],
        mediaPlayers: ['media_player.kitchen'],
        outputs: [],
      }],
      litcal: { enabled: true, calendar: 'general' },
    });

    expect(toSimpleSchedule(config).routines[0]).toMatchObject({
      type: 'hymn_category',
      categoryIds: ['marian'],
      canonicalHour: 'lauds',
    });
    expect(config.routines[0].actions[0]).toMatchObject({
      type: 'select_hymn',
      categoryIds: ['marian'],
      canonicalHours: ['lauds'],
    });
  });
});
