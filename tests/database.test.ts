import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CarillonDatabase } from '../src/database/db.js';

describe('carillon database schedule state', () => {
  it('migrates the legacy row-per-schedule table without losing enabled state', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'virtual-carillon-db-'));
    const filePath = path.join(directory, 'carillon.sqlite');
    const legacy = new DatabaseSync(filePath);
    legacy.exec(`CREATE TABLE schedules (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL,
      days TEXT NOT NULL, time TEXT NOT NULL, asset TEXT NOT NULL,
      output TEXT, liturgical TEXT
    )`);
    legacy.prepare('INSERT INTO schedules VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      'westminster-hour-12', 'Westminster', 1, '[0,1,2,3,4,5,6]', '12:00', 'westminster-hour-12', null, null,
    );
    legacy.close();

    const database = new CarillonDatabase(filePath);
    expect(database.getSchedule()?.config).toMatchObject({
      enabled: true,
      westminster: { enabled: true, cadence: 'every_15' },
    });
    expect(database.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schedules_legacy_v1'").get()).toBeTruthy();
    database.close();
    await rm(directory, { recursive: true, force: true });
  });

  it('reserves claimed hymns before completion and excludes failed runs', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'virtual-carillon-db-'));
    const database = new CarillonDatabase(path.join(directory, 'carillon.sqlite'));
    const payload = JSON.stringify([{ asset: 'apostle-hymn' }]);

    expect(database.claimScheduleRun('2026-08-24T12:00|schedule|ha', payload, '2026-08-24T16:00:00.000Z')).toBe(true);
    expect(database.completedScheduleAssets('2026-08-24')).toContain('apostle-hymn');
    database.completeScheduleRun('2026-08-24T12:00|schedule|ha', 'failed', 'player unavailable', '2026-08-24T16:01:00.000Z');
    expect(database.completedScheduleAssets('2026-08-24')).not.toContain('apostle-hymn');

    database.close();
    await rm(directory, { recursive: true, force: true });
  });
});
