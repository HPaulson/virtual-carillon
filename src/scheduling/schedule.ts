import { z } from 'zod';
import type { LiturgicalCalendarName } from '../liturgical/litcal.js';

const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const WeekdaySchema = z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);

const TriggerSchema = z.object({
  frequency: z.enum(['exact', 'hourly', 'every_15', 'every_30']),
  time: TimeSchema,
  weekdays: z.array(WeekdaySchema).min(1),
  excludedTimes: z.array(TimeSchema),
  notBefore: TimeSchema.optional(),
  notAfter: TimeSchema.optional(),
});

const MediaPlayersSchema = z.array(z.string().regex(/^media_player\.[a-z0-9_]+$/i)).min(1);

const PlayActionSchema = z.object({
  type: z.literal('play'),
  asset: z.string().min(1),
  mediaPlayers: MediaPlayersSchema,
});

const SelectHymnActionSchema = z.object({
  type: z.literal('select_hymn'),
  mediaPlayers: MediaPlayersSchema,
  strategy: z.enum(['fixed', 'sequential', 'random']).default('random'),
  fixedAssetId: z.string().min(1).optional(),
  fallbackAsset: z.string().min(1).optional(),
  seasons: z.array(z.string()).optional(),
  rank: z.string().min(1).optional(),
  feastIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  offices: z.array(z.string()).optional(),
  canonicalHours: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  seed: z.union([z.string(), z.number()]).optional(),
  recentExclusion: z.number().int().min(0).max(100).default(3),
});

const DelayActionSchema = z.object({
  type: z.literal('delay'),
  seconds: z.number().finite().min(0).max(86400),
});

export const ScheduleActionSchema = z.discriminatedUnion('type', [
  PlayActionSchema,
  SelectHymnActionSchema,
  DelayActionSchema,
]);

export const ScheduleRoutineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  trigger: TriggerSchema,
  actions: z.array(ScheduleActionSchema).min(1),
});

const LitcalScheduleSchema = z.object({
  enabled: z.boolean(),
  calendar: z.enum(['general', 'US', 'IT', 'NL', 'VA', 'CA']),
});

export const ScheduleConfigSchema = z.object({
  enabled: z.boolean(),
  routines: z.array(ScheduleRoutineSchema),
  litcal: LitcalScheduleSchema,
});

export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export type ScheduleRoutine = z.infer<typeof ScheduleRoutineSchema>;
export type ScheduleAction = z.infer<typeof ScheduleActionSchema>;

export interface StoredSchedule {
  config: ScheduleConfig;
  updatedAt: string;
}

export interface LocalScheduleTime {
  date: string;
  hour: number;
  minute: number;
  weekday: number;
}

export interface SchedulePlayback {
  asset: string;
  mediaPlayers: string[];
  routineId: string;
  actionIndex: number;
  waitBeforeSeconds: number;
  waitAfterSeconds: number;
}

export interface ScheduleClaim {
  slotKey: string;
  actions: SchedulePlayback[];
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  enabled: false,
  routines: [],
  litcal: { enabled: true, calendar: 'general' },
};

export function normalizeSchedule(input: unknown): ScheduleConfig {
  const value = (input && typeof input === 'object' ? input : {}) as Partial<ScheduleConfig>;
  return ScheduleConfigSchema.parse({
    ...DEFAULT_SCHEDULE_CONFIG,
    ...value,
    routines: value.routines ?? DEFAULT_SCHEDULE_CONFIG.routines,
    litcal: { ...DEFAULT_SCHEDULE_CONFIG.litcal, ...(value.litcal ?? {}) },
  });
}

export function localScheduleTime(value: Date | string): LocalScheduleTime {
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) throw new Error('Schedule time must be an ISO timestamp.');
    return {
      date: match[1],
      hour: Number(match[2]),
      minute: Number(match[3]),
      // The timestamp may carry an HA timezone offset. The date portion is
      // already the user's local calendar date, so do not reinterpret it in
      // the Node container's timezone when applying weekday rules.
      weekday: weekdayForDate(match[1]),
    };
  }
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`,
    hour: value.getHours(),
    minute: value.getMinutes(),
    weekday: value.getDay(),
  };
}

export function scheduleSlotKey(time: LocalScheduleTime, updatedAt: string): string {
  return `${time.date}T${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}|${updatedAt}`;
}

export function routineMatches(routine: ScheduleRoutine, time: LocalScheduleTime): boolean {
  const current = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  if (!routine.enabled || !withinConfiguredWeekdays(routine, time, current)) return false;
  if (routine.trigger.excludedTimes.includes(current)) return false;
  if (!withinTimeWindow(current, routine.trigger.notBefore, routine.trigger.notAfter)) return false;
  switch (routine.trigger.frequency) {
    case 'hourly':
      return time.minute === 0;
    case 'every_15':
      return time.minute % 15 === 0;
    case 'every_30':
      return time.minute % 30 === 0;
    case 'exact':
      return routine.trigger.time === current;
  }
}

function withinConfiguredWeekdays(routine: ScheduleRoutine, time: LocalScheduleTime, current: string): boolean {
  if (routine.trigger.weekdays.includes(weekdayName(time.weekday))) return true;
  if (routine.trigger.notBefore === undefined || routine.trigger.notAfter === undefined) return false;
  const start = minutesSinceMidnight(routine.trigger.notBefore);
  const end = minutesSinceMidnight(routine.trigger.notAfter);
  if (start <= end || minutesSinceMidnight(current) > end) return false;
  // For an overnight window, the selected weekday anchors the window at its
  // start. Monday + 22:00–06:00 therefore includes Tuesday at 05:00.
  return routine.trigger.weekdays.includes(weekdayName((time.weekday + 6) % 7));
}

function withinTimeWindow(current: string, notBefore?: string, notAfter?: string): boolean {
  const currentMinutes = minutesSinceMidnight(current);
  const start = notBefore === undefined ? undefined : minutesSinceMidnight(notBefore);
  const end = notAfter === undefined ? undefined : minutesSinceMidnight(notAfter);
  if (start !== undefined && end !== undefined) {
    // A window whose end is earlier than its start crosses midnight, e.g.
    // 22:00–06:00.
    return start <= end
      ? currentMinutes >= start && currentMinutes <= end
      : currentMinutes >= start || currentMinutes <= end;
  }
  if (start !== undefined && currentMinutes < start) return false;
  if (end !== undefined && currentMinutes > end) return false;
  return true;
}

function minutesSinceMidnight(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function weekdayName(value: number): ScheduleRoutine['trigger']['weekdays'][number] {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][value] as ScheduleRoutine['trigger']['weekdays'][number];
}

function weekdayForDate(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function calendarName(value: string): LiturgicalCalendarName {
  return value as LiturgicalCalendarName;
}
