import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface EventRecord { id?: number; asset: string; output?: string; status: 'started' | 'played' | 'failed'; message?: string; createdAt?: string; }
export class CarillonDatabase {
  readonly db: DatabaseSync;
  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA busy_timeout = 5000');
    try { this.db.exec('PRAGMA journal_mode = WAL'); } catch (error) { if (!(error instanceof Error) || !error.message.includes('database is locked')) throw error; }
    this.db.exec('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, asset TEXT NOT NULL, output TEXT, status TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL)');
  }
  addEvent(event: EventRecord) { this.db.prepare('INSERT INTO events (asset,output,status,message,created_at) VALUES (?,?,?,?,?)').run(event.asset, event.output ?? null, event.status, event.message ?? null, event.createdAt ?? new Date().toISOString()); }
  recentEvents(limit = 20) { return this.db.prepare('SELECT id,asset,output,status,message,created_at as createdAt FROM events ORDER BY id DESC LIMIT ?').all(limit); }
  close() { this.db.close(); }
}
