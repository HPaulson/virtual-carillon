import { ScheduleEntry } from './types.js';

export type SchedulePlayer = (asset: string, output?: string) => Promise<void>;
export type ScheduleAssetResolver = (entry: ScheduleEntry, now: Date) => Promise<string>;
export class Scheduler {
  private timer?: NodeJS.Timeout;
  private lastMinute = '';
  constructor(private entries: ScheduleEntry[], private readonly play: SchedulePlayer, private readonly log: (message: string) => void = console.log, private readonly resolveAsset?: ScheduleAssetResolver) {}
  start() { if (this.timer) return; this.timer = setInterval(() => void this.tick(), 1000); void this.tick(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  setEntries(entries: ScheduleEntry[]) { this.entries = entries; }
  getEntries() { return this.entries; }
  get isRunning() { return Boolean(this.timer); }
  async tick(now = new Date()) {
    const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (minuteKey === this.lastMinute) return;
    this.lastMinute = minuteKey;
    const day = now.getDay();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const entry of this.entries) {
      if (!entry.enabled || !entry.days.includes(day) || !matches(entry.time, now.getHours(), now.getMinutes(), hhmm)) continue;
      try { const asset = this.resolveAsset ? await this.resolveAsset(entry, now) : entry.asset; await this.play(asset, entry.output); this.log(`Played ${asset} for ${entry.name}`); } catch (error) { this.log(`Schedule ${entry.id} failed: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
}
function matches(spec: string, hour: number, minute: number, hhmm: string) { if (/^\d{2}:\d{2}$/.test(spec)) return spec === hhmm; if (spec === 'hourly') return minute === 0; if (spec === '*/15') return minute % 15 === 0; if (spec === '*/30') return minute % 30 === 0; if (/^\d{1,2}:\d{2}$/.test(spec)) return spec === `${hour}:${String(minute).padStart(2, '0')}`; return false; }
