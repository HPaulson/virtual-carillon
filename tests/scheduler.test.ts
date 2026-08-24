import { describe, expect, it } from 'vitest';
import { Scheduler } from '../src/scheduler/scheduler.js';

describe('scheduler', () => {
  it('plays enabled entries once per minute and tolerates failed playback', async () => {
    const played: string[] = [];
    const scheduler = new Scheduler([{ id: 'x', name: 'Test', enabled: true, days: [1], time: '12:00', asset: 'test-bell' }], async (asset) => { played.push(asset); throw new Error('speaker offline'); }, () => undefined);
    await scheduler.tick(new Date('2026-08-24T12:00:00')); // Monday
    await scheduler.tick(new Date('2026-08-24T12:00:20'));
    expect(played).toEqual(['test-bell']);
  });
});
