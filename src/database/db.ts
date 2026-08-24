import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ScheduleEntry } from '../scheduler/types.js';

export interface EventRecord { id?: number; asset: string; output?: string; status: 'started' | 'played' | 'failed'; message?: string; createdAt?: string; }
export class CarillonDatabase {
  readonly db: DatabaseSync;
  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA busy_timeout = 5000');
    try { this.db.exec('PRAGMA journal_mode = WAL'); } catch (error) { if (!(error instanceof Error) || !error.message.includes('database is locked')) throw error; }
    this.db.exec(`CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL, days TEXT NOT NULL, time TEXT NOT NULL, asset TEXT NOT NULL, output TEXT, liturgical TEXT); CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, asset TEXT NOT NULL, output TEXT, status TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL);`);
    try { this.db.exec('ALTER TABLE schedules ADD COLUMN liturgical TEXT'); } catch (error) { if (!(error instanceof Error) || !error.message.includes('duplicate column')) throw error; }
  }
  schedules(): ScheduleEntry[] { return (this.db.prepare('SELECT * FROM schedules ORDER BY name').all() as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), name: String(row.name), enabled: Boolean(row.enabled), days: JSON.parse(String(row.days)), time: String(row.time), asset: String(row.asset), output: row.output ? String(row.output) : undefined, liturgical: row.liturgical ? JSON.parse(String(row.liturgical)) : undefined })); }
  replaceSchedules(entries: ScheduleEntry[]) { const insert = this.db.prepare('INSERT OR REPLACE INTO schedules (id,name,enabled,days,time,asset,output,liturgical) VALUES (?,?,?,?,?,?,?,?)'); this.db.exec('BEGIN'); try { this.db.prepare('DELETE FROM schedules').run(); for (const entry of entries) insert.run(entry.id, entry.name, entry.enabled ? 1 : 0, JSON.stringify(entry.days), entry.time, entry.asset, entry.output ?? null, entry.liturgical ? JSON.stringify(entry.liturgical) : null); this.db.exec('COMMIT'); } catch (error) { this.db.exec('ROLLBACK'); throw error; } }
  addEvent(event: EventRecord) { this.db.prepare('INSERT INTO events (asset,output,status,message,created_at) VALUES (?,?,?,?,?)').run(event.asset, event.output ?? null, event.status, event.message ?? null, event.createdAt ?? new Date().toISOString()); }
  recentEvents(limit = 20) { return this.db.prepare('SELECT id,asset,output,status,message,created_at as createdAt FROM events ORDER BY id DESC LIMIT ?').all(limit); }
  close() { this.db.close(); }
}
