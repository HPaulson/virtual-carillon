import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ScheduleConfig, StoredSchedule } from '../scheduling/schedule.js';

export interface EventRecord {
  id?: number;
  asset: string;
  output?: string;
  status: 'started' | 'played' | 'failed';
  message?: string;
  createdAt?: string;
}
export class CarillonDatabase {
  readonly db: DatabaseSync;
  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA busy_timeout = 5000');
    try {
      this.db.exec('PRAGMA journal_mode = WAL');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('database is locked')) throw error;
    }
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, asset TEXT NOT NULL, output TEXT, status TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL)',
    );
    this.migrateLegacySchedules();
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY CHECK (id = 1), config TEXT NOT NULL, updated_at TEXT NOT NULL)',
    );
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS schedule_runs (slot_key TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL, claimed_at TEXT NOT NULL, completed_at TEXT, message TEXT)',
    );
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS hymn_day_resets (date TEXT PRIMARY KEY, reset_at TEXT NOT NULL)',
    );
  }
  addEvent(event: EventRecord) {
    this.db
      .prepare('INSERT INTO events (asset,output,status,message,created_at) VALUES (?,?,?,?,?)')
      .run(
        event.asset,
        event.output ?? null,
        event.status,
        event.message ?? null,
        event.createdAt ?? new Date().toISOString(),
      );
  }
  recentEvents(limit = 20) {
    return this.db
      .prepare(
        'SELECT id,asset,output,status,message,created_at as createdAt FROM events ORDER BY id DESC LIMIT ?',
      )
      .all(limit);
  }
  completedScheduleAssets(date: string): string[] {
    const reset = this.db
      .prepare('SELECT reset_at as resetAt FROM hymn_day_resets WHERE date = ?')
      .get(date) as { resetAt?: string } | undefined;
    // A claimed run has already reserved its hymn, even while HA is still
    // playing it. This prevents a nearby schedule tick from selecting the
    // same hymn before the first run reaches /complete.
    const rows = (
      reset?.resetAt
        ? this.db
            .prepare(
              "SELECT payload FROM schedule_runs WHERE status IN ('claimed', 'completed') AND slot_key LIKE ? AND COALESCE(completed_at, claimed_at) > ?",
            )
            .all(`${date}T%`, reset.resetAt)
        : this.db
            .prepare(
              "SELECT payload FROM schedule_runs WHERE status IN ('claimed', 'completed') AND slot_key LIKE ?",
            )
            .all(`${date}T%`)
    ) as Array<{ payload?: string }>;
    const reservedAssets = rows.flatMap((row) => {
      try {
        const actions = JSON.parse(row.payload ?? '[]') as Array<{ asset?: string }>;
        return actions.flatMap((action) => (action.asset ? [action.asset] : []));
      } catch {
        return [];
      }
    });
    // Home Assistant records the actual playback through /api/play. Include
    // those successful events as well, so a hymn remains excluded even if a
    // schedule run was completed by an older server or its claim row was not
    // persisted. Events are stored as ISO timestamps; the schedule date is
    // the local date and normally has the same ISO date in this deployment.
    const playedEvents = this.db
      .prepare(
        "SELECT asset FROM events WHERE status IN ('started', 'played') AND created_at LIKE ?",
      )
      .all(`${date}T%`) as Array<{ asset?: string }>;
    return [
      ...new Set([
        ...reservedAssets,
        ...playedEvents.flatMap((event) => (event.asset ? [event.asset] : [])),
      ]),
    ];
  }
  resetHymnDay(date: string, now = new Date().toISOString()) {
    this.db
      .prepare(
        'INSERT INTO hymn_day_resets (date, reset_at) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reset_at = excluded.reset_at',
      )
      .run(date, now);
  }
  getSchedule(): StoredSchedule | undefined {
    const row = this.db
      .prepare('SELECT config, updated_at as updatedAt FROM schedules WHERE id = 1')
      .get() as { config?: string; updatedAt?: string } | undefined;
    if (!row?.config || !row.updatedAt) return undefined;
    return { config: JSON.parse(row.config) as ScheduleConfig, updatedAt: row.updatedAt };
  }
  saveSchedule(config: ScheduleConfig): StoredSchedule {
    const updatedAt = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO schedules (id,config,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config, updated_at=excluded.updated_at',
      )
      .run(JSON.stringify(config), updatedAt);
    return { config, updatedAt };
  }
  claimScheduleRun(slotKey: string, payload: string, now = new Date().toISOString()): boolean {
    const existing = this.db
      .prepare('SELECT status, claimed_at as claimedAt FROM schedule_runs WHERE slot_key = ?')
      .get(slotKey) as { status?: string; claimedAt?: string } | undefined;
    if (existing?.status === 'completed') return false;
    if (existing?.claimedAt && Date.parse(existing.claimedAt) > Date.parse(now) - 2 * 60 * 1000)
      return false;
    this.db
      .prepare(
        'INSERT INTO schedule_runs (slot_key,payload,status,claimed_at,completed_at,message) VALUES (?,?,?,?,NULL,NULL) ON CONFLICT(slot_key) DO UPDATE SET payload=excluded.payload, status=excluded.status, claimed_at=excluded.claimed_at, completed_at=NULL, message=NULL',
      )
      .run(slotKey, payload, 'claimed', now);
    return true;
  }
  completeScheduleRun(
    slotKey: string,
    status: 'completed' | 'failed',
    message?: string,
    now = new Date().toISOString(),
  ) {
    this.db
      .prepare(
        'UPDATE schedule_runs SET status = ?, completed_at = ?, message = ? WHERE slot_key = ?',
      )
      .run(status, now, message ?? null, slotKey);
  }

  private migrateLegacySchedules() {
    const columns = this.db.prepare('PRAGMA table_info(schedules)').all() as Array<{
      name?: string;
    }>;
    if (!columns.length || columns.some((column) => column.name === 'config')) return;

    const legacyRows = this.db.prepare('SELECT enabled, output FROM schedules').all() as Array<{
      enabled?: number;
      output?: string | null;
    }>;
    this.db.exec('ALTER TABLE schedules RENAME TO schedules_legacy_v1');
    this.db.exec(
      'CREATE TABLE schedules (id INTEGER PRIMARY KEY CHECK (id = 1), config TEXT NOT NULL, updated_at TEXT NOT NULL)',
    );

    const enabled = legacyRows.some((row) => row.enabled === 1);
    const outputs = [
      ...new Set(
        legacyRows.map((row) => row.output).filter((output): output is string => Boolean(output)),
      ),
    ];
    const config = {
      enabled,
      westminster: {
        enabled,
        cadence: 'every_15',
        weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        mediaPlayers: [],
        outputs,
      },
      routines: [],
      litcal: { calendar: 'general' },
    };
    this.db
      .prepare('INSERT INTO schedules (id, config, updated_at) VALUES (1, ?, ?)')
      .run(JSON.stringify(config), new Date().toISOString());
    console.info(
      `[database] migrated legacy schedules table (${legacyRows.length} rows preserved as schedules_legacy_v1)`,
    );
  }

  close() {
    this.db.close();
  }
}
