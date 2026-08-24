import { z } from 'zod';
import type { LiturgicalCalendarName } from '../liturgical/litcal.js';

const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const WeekdaySchema = z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
const WeekdaysSchema = z.array(WeekdaySchema).min(1);
const OptionalMediaPlayersSchema = z.array(z.string().regex(/^media_player\.[a-z0-9_]+$/i));
const NativeOutputsSchema = z.array(z.string().min(1));
const VolumeSchema = z.number().finite().min(0).max(100).optional();

const TriggerSchema = z.object({
  frequency: z.enum(['exact', 'hourly', 'every_15', 'every_30']),
  time: TimeSchema,
  times: z.array(TimeSchema).min(1).optional(),
  weekdays: WeekdaysSchema,
  excludedTimes: z.array(TimeSchema),
  notBefore: TimeSchema.optional(),
  notAfter: TimeSchema.optional(),
});

const PlayActionSchema = z.object({
  type: z.literal('play'),
  asset: z.string().min(1),
  volume: VolumeSchema,
  mediaPlayers: OptionalMediaPlayersSchema.default([]),
  outputs: NativeOutputsSchema.default([]),
});

const SelectHymnActionSchema = z.object({
  type: z.literal('select_hymn'),
  volume: VolumeSchema,
  mediaPlayers: OptionalMediaPlayersSchema.default([]),
  outputs: NativeOutputsSchema.default([]),
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

export const WestminsterScheduleSchema = z.object({
  enabled: z.boolean(),
  cadence: z.enum(['every_15', 'every_30', 'hourly']),
  weekdays: WeekdaysSchema,
  notBefore: TimeSchema.optional(),
  notAfter: TimeSchema.optional(),
  mediaPlayers: OptionalMediaPlayersSchema,
  outputs: NativeOutputsSchema.default([]),
});

const LitcalScheduleSchema = z.object({
  enabled: z.boolean(),
  calendar: z.enum(['general', 'US', 'IT', 'NL', 'VA', 'CA']),
});

export const ScheduleConfigSchema = z.object({
  enabled: z.boolean(),
  westminster: WestminsterScheduleSchema,
  routines: z.array(ScheduleRoutineSchema),
  litcal: LitcalScheduleSchema,
});

export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export type ScheduleRoutine = z.infer<typeof ScheduleRoutineSchema>;
export type ScheduleAction = z.infer<typeof ScheduleActionSchema>;
export type WestminsterSchedule = z.infer<typeof WestminsterScheduleSchema>;

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
  volume?: number;
  mediaPlayers: string[];
  outputs: string[];
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
  westminster: {
    enabled: false,
    cadence: 'every_15',
    weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    mediaPlayers: [],
    outputs: [],
  },
  routines: [],
  litcal: { enabled: true, calendar: 'general' },
};

export function normalizeSchedule(input: unknown): ScheduleConfig {
  const value = (input && typeof input === 'object' ? input : {}) as Partial<ScheduleConfig> & Record<string, unknown>;
  return ScheduleConfigSchema.parse({
    ...DEFAULT_SCHEDULE_CONFIG,
    ...value,
    westminster: { ...DEFAULT_SCHEDULE_CONFIG.westminster, ...(value.westminster ?? {}) },
    routines: Array.isArray(value.routines)
      ? value.routines.map((routine, index) => normalizeRoutine(routine, index))
      : DEFAULT_SCHEDULE_CONFIG.routines,
    litcal: { ...DEFAULT_SCHEDULE_CONFIG.litcal, ...(value.litcal ?? {}) },
  });
}

function normalizeRoutine(value: unknown, index: number): unknown {
  if (!value || typeof value !== 'object') return value;
  const routine = value as Record<string, unknown>;
  if (Array.isArray(routine.actions)) return routine;

  const type = routine.type === 'liturgical_hymn' ? 'liturgical_hymn' : 'play';
  const times = Array.isArray(routine.times) && routine.times.length ? routine.times : ['12:00'];
  const canonicalHour = typeof routine.canonicalHour === 'string'
    ? routine.canonicalHour
    : Array.isArray(routine.canonicalHours) && typeof routine.canonicalHours[0] === 'string'
      ? routine.canonicalHours[0]
      : undefined;
  const action = type === 'liturgical_hymn'
    ? {
      type: 'select_hymn',
      strategy: routine.strategy ?? 'random',
      fallbackAsset: routine.fallbackAsset,
      volume: routine.volume,
      canonicalHours: canonicalHour ? [canonicalHour] : undefined,
      mediaPlayers: routine.mediaPlayers ?? [],
      outputs: routine.outputs ?? [],
    }
    : {
      type: 'play',
      asset: routine.type === 'angelus' ? 'angelus' : routine.asset,
      volume: routine.volume,
      mediaPlayers: routine.mediaPlayers ?? [],
      outputs: routine.outputs ?? [],
    };
  return {
    id: routine.id ?? `routine-${index + 1}`,
    name: routine.name ?? (routine.type === 'liturgical_hymn' ? 'Liturgical hymn' : routine.asset ?? 'Scheduled asset'),
    enabled: routine.enabled ?? true,
    trigger: {
      frequency: 'exact',
      time: times[0],
      times,
      weekdays: routine.weekdays ?? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      excludedTimes: routine.excludedTimes ?? [],
      notBefore: routine.notBefore,
      notAfter: routine.notAfter,
    },
    actions: [action],
  };
}

export function toSimpleSchedule(config: ScheduleConfig) {
  return {
    enabled: config.enabled,
    westminster: config.westminster,
    litcal: config.litcal,
    routines: config.routines.map((routine) => {
      const action = routine.actions.find((candidate) => candidate.type !== 'delay');
      const isHymn = action?.type === 'select_hymn';
      return {
        id: routine.id,
        name: routine.name,
        enabled: routine.enabled,
        type: isHymn ? 'liturgical_hymn' : 'asset',
        ...(isHymn ? { fallbackAsset: action.fallbackAsset } : { asset: action?.type === 'play' ? action.asset : undefined }),
        ...(action?.type === 'play' || action?.type === 'select_hymn'
          ? (action.volume === undefined ? {} : { volume: action.volume })
          : {}),
        ...(isHymn && action.canonicalHours?.length ? { canonicalHour: action.canonicalHours[0] } : {}),
        times: routine.trigger.times ?? [routine.trigger.time],
        weekdays: routine.trigger.weekdays,
        notBefore: routine.trigger.notBefore,
        notAfter: routine.trigger.notAfter,
        mediaPlayers: action?.mediaPlayers ?? [],
        outputs: action?.outputs ?? [],
      };
    }),
  };
}

export function localScheduleTime(value: Date | string): LocalScheduleTime {
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) throw new Error('Schedule time must be an ISO timestamp.');
    return {
      date: match[1],
      hour: Number(match[2]),
      minute: Number(match[3]),
      // HA sends the local date and time with an offset. Use the date portion
      // directly instead of reinterpreting it in the Node container timezone.
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

export function scheduleSlotKey(time: LocalScheduleTime, updatedAt: string, runner = 'default'): string {
  return `${time.date}T${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}|${updatedAt}|${runner}`;
}

export function routineMatches(routine: ScheduleRoutine, time: LocalScheduleTime): boolean {
  const current = formatTime(time.hour, time.minute);
  if (!routine.enabled || !withinConfiguredWeekdays(routine.trigger, time, current)) return false;
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
      return (routine.trigger.times ?? [routine.trigger.time]).includes(current);
  }
}

export function westminsterMatches(schedule: WestminsterSchedule, time: LocalScheduleTime): boolean {
  if (!schedule.enabled) return false;
  const current = formatTime(time.hour, time.minute);
  const trigger = {
    weekdays: schedule.weekdays,
    notBefore: schedule.notBefore,
    notAfter: schedule.notAfter,
  };
  if (!withinConfiguredWeekdays(trigger, time, current) || !withinTimeWindow(current, schedule.notBefore, schedule.notAfter)) return false;
  if (time.minute === 0) return true;
  if (schedule.cadence === 'every_15') return [15, 30, 45].includes(time.minute);
  return schedule.cadence === 'every_30' && time.minute === 30;
}

export function westminsterAsset(schedule: WestminsterSchedule, time: LocalScheduleTime): string | undefined {
  if (!westminsterMatches(schedule, time)) return undefined;
  if (time.minute === 0) return `westminster-hour-${time.hour % 12 || 12}`;
  if (time.minute === 15) return 'westminster-quarter';
  if (time.minute === 30) return 'westminster-half';
  if (time.minute === 45) return 'westminster-three-quarter';
  return undefined;
}

function withinConfiguredWeekdays(
  trigger: Pick<ScheduleRoutine['trigger'], 'weekdays' | 'notBefore' | 'notAfter'>,
  time: LocalScheduleTime,
  current: string,
): boolean {
  if (trigger.weekdays.includes(weekdayName(time.weekday))) return true;
  if (trigger.notBefore === undefined || trigger.notAfter === undefined) return false;
  const start = minutesSinceMidnight(trigger.notBefore);
  const end = minutesSinceMidnight(trigger.notAfter);
  if (start <= end || minutesSinceMidnight(current) > end) return false;
  // Monday + 22:00–06:00 includes Tuesday at 05:00.
  return trigger.weekdays.includes(weekdayName((time.weekday + 6) % 7));
}

function withinTimeWindow(current: string, notBefore?: string, notAfter?: string): boolean {
  const currentMinutes = minutesSinceMidnight(current);
  const start = notBefore === undefined ? undefined : minutesSinceMidnight(notBefore);
  const end = notAfter === undefined ? undefined : minutesSinceMidnight(notAfter);
  if (start !== undefined && end !== undefined) {
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

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
