import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ScheduleConfig, StoredSchedule } from '../scheduling/schedule.js';

export interface EventRecord { id?: number; asset: string; output?: string; status: 'started' | 'played' | 'failed'; message?: string; createdAt?: string; }
export class CarillonDatabase {
  readonly db: DatabaseSync;
  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA busy_timeout = 5000');
    try { this.db.exec('PRAGMA journal_mode = WAL'); } catch (error) { if (!(error instanceof Error) || !error.message.includes('database is locked')) throw error; }
    this.db.exec('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, asset TEXT NOT NULL, output TEXT, status TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY CHECK (id = 1), config TEXT NOT NULL, updated_at TEXT NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS schedule_runs (slot_key TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL, claimed_at TEXT NOT NULL, completed_at TEXT, message TEXT)');
  }
  addEvent(event: EventRecord) { this.db.prepare('INSERT INTO events (asset,output,status,message,created_at) VALUES (?,?,?,?,?)').run(event.asset, event.output ?? null, event.status, event.message ?? null, event.createdAt ?? new Date().toISOString()); }
  recentEvents(limit = 20) { return this.db.prepare('SELECT id,asset,output,status,message,created_at as createdAt FROM events ORDER BY id DESC LIMIT ?').all(limit); }
  getSchedule(): StoredSchedule | undefined {
    const row = this.db.prepare('SELECT config, updated_at as updatedAt FROM schedules WHERE id = 1').get() as { config?: string; updatedAt?: string } | undefined;
    if (!row?.config || !row.updatedAt) return undefined;
    return { config: JSON.parse(row.config) as ScheduleConfig, updatedAt: row.updatedAt };
  }
  saveSchedule(config: ScheduleConfig): StoredSchedule {
    const updatedAt = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO schedules (id,config,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config, updated_at=excluded.updated_at',
    ).run(JSON.stringify(config), updatedAt);
    return { config, updatedAt };
  }
  claimScheduleRun(slotKey: string, payload: string, now = new Date().toISOString()): boolean {
    const existing = this.db.prepare('SELECT status, claimed_at as claimedAt FROM schedule_runs WHERE slot_key = ?').get(slotKey) as { status?: string; claimedAt?: string } | undefined;
    if (existing?.status === 'completed') return false;
    if (existing?.claimedAt && Date.parse(existing.claimedAt) > Date.parse(now) - 2 * 60 * 1000) return false;
    this.db.prepare(
      'INSERT INTO schedule_runs (slot_key,payload,status,claimed_at,completed_at,message) VALUES (?,?,?,?,NULL,NULL) ON CONFLICT(slot_key) DO UPDATE SET payload=excluded.payload, status=excluded.status, claimed_at=excluded.claimed_at, completed_at=NULL, message=NULL',
    ).run(slotKey, payload, 'claimed', now);
    return true;
  }
  completeScheduleRun(slotKey: string, status: 'completed' | 'failed', message?: string, now = new Date().toISOString()) {
    this.db.prepare('UPDATE schedule_runs SET status = ?, completed_at = ?, message = ? WHERE slot_key = ?').run(status, now, message ?? null, slotKey);
  }
  close() { this.db.close(); }
}
