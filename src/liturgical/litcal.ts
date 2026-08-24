import fs from 'node:fs/promises';
import path from 'node:path';
import { inferLiturgicalTags, rankId, seasonId, type LiturgicalTags } from './taxonomy.js';

export interface LiturgicalCelebration {
  key?: string;
  name: string;
  rank?: string;
  rankId?: string;
  grade?: number;
  color?: string;
  season?: string;
  feastType?: string;
  liturgicalTags: LiturgicalTags;
}

export interface LiturgicalDay {
  date: string;
  season?: string;
  seasonIds: string[];
  color?: string;
  celebrations: LiturgicalCelebration[];
  primaryCelebration?: LiturgicalCelebration;
  source: string;
}

export interface LitCalConfig {
  enabled: boolean;
  baseUrl?: string;
  calendar?: 'general' | 'US' | 'IT' | 'NL' | 'VA' | 'CA';
  cacheDir: string;
  cacheTtlMs?: number;
}

const DEFAULT_BASE_URL = 'https://litcal.johnromanodorazio.com/api/v5';

/** Optional LitCal client. A stale year cache is always preferred to blocking a bell schedule. */
export class LiturgicalCalendarClient {
  private readonly config: Required<Omit<LitCalConfig, 'baseUrl' | 'calendar'>> & Pick<LitCalConfig, 'baseUrl' | 'calendar'>;
  private readonly memory = new Map<number, LiturgicalDay[]>();

  constructor(config: LitCalConfig) {
    this.config = { enabled: config.enabled, cacheDir: config.cacheDir, cacheTtlMs: config.cacheTtlMs ?? 14 * 24 * 60 * 60 * 1000, baseUrl: config.baseUrl ?? DEFAULT_BASE_URL, calendar: config.calendar ?? 'general' };
  }

  get enabled() { return this.config.enabled; }
  get baseUrl() { return this.config.baseUrl; }

  async getDay(date: Date | string): Promise<LiturgicalDay | undefined> {
    if (!this.config.enabled) return undefined;
    const iso = typeof date === 'string' ? date.slice(0, 10) : localDate(date);
    const year = Number(iso.slice(0, 4));
    const days = await this.getYear(year);
    return days.find((day) => day.date === iso);
  }

  async getYear(year: number): Promise<LiturgicalDay[]> {
    if (!this.config.enabled) return [];
    const cached = this.memory.get(year);
    if (cached) return cached;
    const cachePath = path.join(this.config.cacheDir, `litcal-${this.config.calendar ?? 'general'}-${year}.json`);
    const disk = await readCache(cachePath);
    if (disk && Date.now() - disk.cachedAt < this.config.cacheTtlMs) {
      this.memory.set(year, disk.days);
      return disk.days;
    }
    try {
      const response = await fetch(this.urlFor(year), { headers: { accept: 'application/json', 'accept-language': 'en-US' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`LitCal HTTP ${response.status}`);
      const days = normaliseCalendar(await response.json() as unknown, this.config.baseUrl ?? DEFAULT_BASE_URL);
      await fs.mkdir(this.config.cacheDir, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify({ cachedAt: Date.now(), days }));
      this.memory.set(year, days);
      return days;
    } catch {
      if (disk) { this.memory.set(year, disk.days); return disk.days; }
      return [];
    }
  }

  private urlFor(year: number): string {
    const calendar = this.config.calendar ?? 'general';
    const pathPart = calendar === 'general' ? `/calendar/${year}` : `/calendar/nation/${calendar}/${year}`;
    return `${(this.config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')}${pathPart}?year_type=CIVIL`;
  }
}

interface CacheFile { cachedAt: number; days: LiturgicalDay[]; }
async function readCache(filePath: string): Promise<CacheFile | undefined> {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as CacheFile;
    return { ...parsed, days: (parsed.days ?? []).map(hydrateCachedDay) };
  } catch { return undefined; }
}

function hydrateCachedDay(day: LiturgicalDay): LiturgicalDay {
  const celebrations = (day.celebrations ?? []).map((event) => {
    const tags = event.liturgicalTags ?? inferLiturgicalTags({ key: event.key, name: event.name, season: event.season, rank: event.rank, grade: event.grade });
    return { ...event, rankId: event.rankId ?? rankId(event.grade, event.rank), liturgicalTags: tags };
  });
  celebrations.sort((left, right) => (right.grade ?? gradeForRank(right.rank)) - (left.grade ?? gradeForRank(left.rank)));
  return {
    ...day,
    seasonIds: [...new Set([...(day.seasonIds ?? []), seasonId(day.season), ...celebrations.flatMap((event) => event.liturgicalTags.seasons)])],
    celebrations,
    primaryCelebration: celebrations[0],
  };
}

function normaliseCalendar(value: unknown, source: string): LiturgicalDay[] {
  const root = isRecord(value) && 'litcal' in value ? value.litcal : value;
  const entries: Array<[string | undefined, unknown]> = Array.isArray(root) ? root.map((item) => [undefined, item]) : isRecord(root) ? Object.entries(root) : [];
  const days = new Map<string, LiturgicalDay>();
  for (const [dateKey, raw] of entries) {
    if (!isRecord(raw)) continue;
    const date = stringValue(raw.date ?? raw.day ?? raw.date_iso ?? dateKey);
    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
    const iso = date.slice(0, 10);
    const events = Array.isArray(raw.events) ? raw.events : Array.isArray(raw.celebrations) ? raw.celebrations : [raw];
    const existing = days.get(iso) ?? { date: iso, season: undefined, seasonIds: [], color: undefined, celebrations: [], source };
    existing.season ??= stringValue(raw.season ?? raw.liturgical_season);
    existing.seasonIds.push(seasonId(existing.season));
    existing.color ??= stringArrayValue(raw.color ?? raw.liturgical_color);
    existing.celebrations.push(...events.flatMap((event) => normaliseCelebration(event, raw)));
    days.set(iso, existing);
  }
  return [...days.values()].map((day) => {
    day.seasonIds = [...new Set([...day.seasonIds, ...day.celebrations.flatMap((celebration) => celebration.liturgicalTags.seasons)])];
    day.celebrations.sort((left, right) => (right.grade ?? gradeForRank(right.rank)) - (left.grade ?? gradeForRank(left.rank)));
    day.primaryCelebration = day.celebrations[0];
    return day;
  }).sort((left, right) => left.date.localeCompare(right.date));
}

function normaliseCelebration(value: unknown, inherited?: Record<string, unknown>): LiturgicalCelebration[] {
  if (!isRecord(value)) return [];
  const locales = isRecord(value.locales) ? value.locales : undefined;
  const name = stringValue(value.name ?? value.title ?? locales?.en) ?? 'Unnamed celebration';
  const grade = numberValue(value.grade ?? value.precedence);
  const rank = stringValue(value.grade_display ?? value.grade_lcl ?? value.rank ?? value.liturgical_rank);
  const season = stringValue(value.season ?? value.liturgical_season ?? inherited?.season ?? inherited?.liturgical_season);
  const tags = inferLiturgicalTags({ key: stringValue(value.event_key ?? value.key), name, season, grade, rank, common: stringArray(value.common) });
  return [{ key: stringValue(value.event_key ?? value.key), name, rank, rankId: rankId(grade, rank), grade, color: stringArrayValue(value.color ?? value.liturgical_color), season, feastType: stringValue(value.feast_type ?? value.type), liturgicalTags: tags }];
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function stringValue(value: unknown): string | undefined { return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined; }
function numberValue(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined; }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function stringArrayValue(value: unknown): string | undefined { return stringArray(value)[0] ?? stringValue(value); }
function localDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function gradeForRank(rank?: string): number { const text = rank?.toLowerCase() ?? ''; if (text.includes('solemn')) return 6; if (text.includes('feast')) return 4; if (text.includes('memorial')) return text.includes('optional') ? 2 : 3; return 0; }
