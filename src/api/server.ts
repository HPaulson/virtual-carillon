import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { AudioEngine } from '../audio/engine.js';
import { bluetoothStatus, discoverOutputs } from '../audio/outputs.js';
import { AssetLibrary } from '../library/library.js';
import { HymnCatalog, HymnQuery } from '../library/catalog.js';
import { CarillonDatabase } from '../database/db.js';
import { platformSummary } from '../configuration/config.js';
import { LiturgicalCalendarClient, LiturgicalDay } from '../liturgical/litcal.js';
import { conditionMatches, LiturgicalCondition, toHymnQuery } from '../liturgical/resolver.js';
import {
  DEFAULT_SCHEDULE_CONFIG,
  localScheduleTime,
  normalizeSchedule,
  routineMatches,
  scheduleSlotKey,
  toSimpleSchedule,
  westminsterAsset,
  type ScheduleConfig,
  type ScheduleAction,
  type SchedulePlayback,
} from '../scheduling/schedule.js';

const DistanceOverrides = z
  .object({
    gain: z.number().positive().optional(),
    highCutHz: z.number().positive().optional(),
    attackGain: z.number().nonnegative().optional(),
    reflectionMix: z.number().nonnegative().optional(),
    reflectionDelays: z.array(z.number().nonnegative()).optional(),
    reflectionGains: z.array(z.number().nonnegative()).optional(),
    stereoSpread: z.number().nonnegative().optional(),
  })
  .partial();
const PlaySchema = z.object({
  asset: z.string().min(1),
  output: z.string().optional(),
  distance: z
    .enum(['near', 'church-grounds', 'quarter-mile', 'half-mile', 'one-mile', 'custom'])
    .optional(),
  customDistance: DistanceOverrides.optional(),
});
const LiturgicalSelectionSchema = z.object({
  seasons: z.array(z.string()).optional(),
  rank: z.string().optional(),
  feastIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  offices: z.array(z.string()).optional(),
  canonicalHours: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  strategy: z.enum(['fixed', 'sequential', 'random']).optional(),
  fixedAssetId: z.string().optional(),
  seed: z.union([z.string(), z.number()]).optional(),
  recentExclusion: z.number().int().min(0).optional(),
});
const HymnQuerySchema = z.object({
  feastIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  seasonIds: z.array(z.string()).optional(),
  officeIds: z.array(z.string()).optional(),
  canonicalHours: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  strategy: z.enum(['fixed', 'sequential', 'random']).optional(),
  fixedAssetId: z.string().optional(),
  seed: z.union([z.string(), z.number()]).optional(),
  recentExclusion: z.number().int().min(0).optional(),
});
const HymnSelectSchema = LiturgicalSelectionSchema.extend({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  useLitCal: z.boolean().optional(),
  calendar: z.enum(['general', 'US', 'IT', 'NL', 'VA', 'CA']).optional(),
});
const ScheduleClaimSchema = z.object({ at: z.string().min(1) });
const ScheduleCompleteSchema = z.object({
  slotKey: z.string().min(1),
  status: z.enum(['completed', 'failed']),
  message: z.string().optional(),
});
const ScheduleRunSchema = z.object({
  at: z.string().min(1).optional(),
  output: z.string().min(1).optional(),
});
type ScheduleRunner = 'home_assistant' | 'native';
const ImportSchema = z.object({
  name: z.string().min(1),
  sourcePath: z.string().min(1),
  id: z.string().optional(),
  type: z.enum(['recording', 'hymn']).optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  liturgicalSeasons: z.array(z.string()).optional(),
  feastTypes: z.array(z.string()).optional(),
  liturgicalTags: z.record(z.array(z.string())).optional(),
});

export interface ServerServices {
  engine: AudioEngine;
  library: AssetLibrary;
  database: CarillonDatabase;
  liturgicalCalendar?: LiturgicalCalendarClient;
  hymnCatalog?: HymnCatalog;
  apiToken?: string;
}
export async function createServer(services: ServerServices): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const hymnCatalog = services.hymnCatalog ?? new HymnCatalog(services.library);
  const nativeScheduleTimer = setInterval(() => {
    void runNativeSchedule(new Date(), undefined, services).then((result) => {
      if ('error' in result) app.log.error(`Native schedule playback failed: ${result.error}`);
    }).catch((error) => {
      app.log.error(`Native schedule evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, 5000);
  nativeScheduleTimer.unref();
  app.addHook('onClose', async () => clearInterval(nativeScheduleTimer));
  await app.register(cors, { origin: true });
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS' || !services.apiToken || (!request.url.startsWith('/api/') && request.url !== '/api')) return;
    const authorization = request.headers.authorization;
    const providedToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!providedToken || !tokensMatch(services.apiToken, providedToken)) {
      return reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer')
        .send({ error: 'Unauthorized' });
    }
  });
  app.get('/health', async () => ({ ok: true, service: 'virtual-carillon', ...platformSummary() }));
  app.get('/api/status', async () => ({
    ok: true,
    audio: { defaultDistance: services.engine.defaultDistanceProfile },
    outputs: await discoverOutputs(),
    bluetooth: await bluetoothStatus(),
    recentEvents: services.database.recentEvents(10),
  }));
  // The public schedule contract uses the product vocabulary (Westminster,
  // assets, Angelus, and liturgical hymns). The stored action graph remains an
  // implementation detail used by the HA claim endpoint.
  app.get('/api/schedule', async () => simpleStoredSchedule(services));
  app.get('/api/schedule/simple', async () => simpleStoredSchedule(services));
  app.put('/api/schedule', async (request, reply) => {
    try {
      return simpleSavedSchedule(services.database.saveSchedule(normalizeSchedule(request.body)));
    } catch (error) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: error.flatten() });
      throw error;
    }
  });
  app.put('/api/schedule/simple', async (request, reply) => {
    try {
      return simpleSavedSchedule(services.database.saveSchedule(normalizeSchedule(request.body)));
    } catch (error) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: error.flatten() });
      throw error;
    }
  });
  app.post('/api/schedule/claim', async (request, reply) => {
    const parsed = ScheduleClaimSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      const stored = currentStoredSchedule(services);
      const time = localScheduleTime(parsed.data.at);
      const actions = await scheduledPlaybacks(time, stored.config, services, hymnCatalog, 'home_assistant');
      if (!actions.length) return { due: false, actions: [] };
      const slotKey = scheduleSlotKey(time, stored.updatedAt, 'home_assistant');
      const claimed = services.database.claimScheduleRun(slotKey, JSON.stringify(actions));
      return { due: true, claimed, slotKey, actions: claimed ? actions : [] };
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.post('/api/schedule/complete', async (request, reply) => {
    const parsed = ScheduleCompleteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    services.database.completeScheduleRun(parsed.data.slotKey, parsed.data.status, parsed.data.message);
    return { ok: true };
  });
  app.post('/api/schedule/run', async (request, reply) => {
    const parsed = ScheduleRunSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      const result = await runNativeSchedule(parsed.data.at ?? new Date(), parsed.data.output, services);
      return 'error' in result ? reply.code(503).send(result) : result;
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.get('/api/devices', async () => ({
    outputs: await discoverOutputs(),
    bluetooth: await bluetoothStatus(),
  }));
  app.get('/api/assets', async () => ({ assets: services.library.list() }));
  app.get('/api/hymns', async (request, reply) => {
    const parsed = HymnQuerySchema.safeParse(queryFromRequest(request.query));
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return { hymns: hymnCatalog.list(parsed.data as HymnQuery) };
  });
  app.get<{ Params: { hymn: string } }>('/api/hymns/:hymn', async (request, reply) => {
    const hymn = hymnCatalog.list().find((asset) => asset.id === request.params.hymn);
    return hymn
      ? { hymn }
      : reply.code(404).send({ error: `Unknown hymn: ${request.params.hymn}` });
  });
  app.get<{ Params: { asset: string } }>('/api/assets/:asset/audio', async (request, reply) => {
    try {
      const filePath = await services.library.resolveAndRender(request.params.asset);
      return reply.type(mimeType(filePath)).send(await fs.readFile(filePath));
    } catch (error) {
      return reply
        .code(404)
        .send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.post('/api/assets/import', async (request, reply) => {
    const parsed = ImportSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      return { asset: await services.library.importRecording(parsed.data) };
    } catch (error) {
      return reply
        .code(400)
        .send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.delete<{ Params: { asset: string } }>('/api/assets/:asset', async (request, reply) => {
    try {
      await services.library.removeUserAsset(request.params.asset);
      return { ok: true };
    } catch (error) {
      return reply
        .code(404)
        .send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.get<{ Params: { date: string }; Querystring: { calendar?: string } }>('/api/liturgical/:date', async (request, reply) => {
    const parsedCalendar = CalendarSchema.safeParse(request.query.calendar ?? 'general');
    if (!parsedCalendar.success) return reply.code(400).send({ error: parsedCalendar.error.flatten() });
    const day = await services.liturgicalCalendar?.getDay(request.params.date, parsedCalendar.data);
    return { calendar: parsedCalendar.data, day };
  });
  app.get<{ Params: { date: string }; Querystring: { calendar?: string } }>('/api/liturgical/:date/hymn', async (request, reply) => {
    const parsedCalendar = CalendarSchema.safeParse(request.query.calendar ?? 'general');
    if (!parsedCalendar.success) return reply.code(400).send({ error: parsedCalendar.error.flatten() });
    const day = await services.liturgicalCalendar?.getDay(request.params.date, parsedCalendar.data);
    if (!day)
      return reply.code(404).send({ error: 'No liturgical day is available for this date' });
    return {
      calendar: parsedCalendar.data,
      day,
      selection: hymnCatalog.selectForDay(day),
    };
  });
  app.post('/api/hymns/select', async (request, reply) => {
    const parsed = HymnSelectSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { date, useLitCal = true, calendar = 'general', ...input } = parsed.data;
    const selectedDate = date ?? localDate(new Date());
    const day = useLitCal
      ? await services.liturgicalCalendar?.getDay(selectedDate, calendar)
      : neutralLiturgicalDay(selectedDate);
    if (!day)
      return reply
        .code(503)
        .send({ error: 'Liturgical calendar is unavailable for this date' });
    const condition: LiturgicalCondition = input;
    if (!conditionMatches(day, condition)) {
      return {
        day,
        selection: { candidates: [], matchedBy: 'none' as const },
      };
    }
    return { day, selection: hymnCatalog.selectForDay(day, toHymnQuery(condition)) };
  });
  app.post('/api/play', async (request, reply) => {
    const parsed = PlaySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { asset, output, distance, customDistance } = parsed.data;
    try {
      const result = await services.library.playAsset(
        asset,
        (await discoverOutputs()).find((item) => item.id === output || item.name === output),
        { distance, customDistance },
      );
      services.database.addEvent({ asset, output, status: 'played' });
      return { ok: true, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      services.database.addEvent({ asset, output, status: 'failed', message });
      return reply.code(503).send({ ok: false, error: message });
    }
  });
  app.post('/api/stop', async () => {
    services.engine.stop();
    return { ok: true };
  });
  return app;
}

function currentStoredSchedule(services: ServerServices) {
  const stored = services.database.getSchedule();
  return stored
    ? { ...stored, config: normalizeSchedule(stored.config) }
    : { config: DEFAULT_SCHEDULE_CONFIG, updatedAt: 'default' };
}

function simpleStoredSchedule(services: ServerServices) {
  const stored = currentStoredSchedule(services);
  return { config: toSimpleSchedule(stored.config), updatedAt: stored.updatedAt };
}

function simpleSavedSchedule(stored: { config: ScheduleConfig; updatedAt: string }) {
  return { config: toSimpleSchedule(stored.config), updatedAt: stored.updatedAt };
}

async function scheduledPlaybacks(
  time: ReturnType<typeof localScheduleTime>,
  config: ScheduleConfig,
  services: ServerServices,
  hymnCatalog: HymnCatalog,
  runner: ScheduleRunner,
): Promise<SchedulePlayback[]> {
  if (!config.enabled) return [];

  const playbacks: SchedulePlayback[] = [];
  let pendingDelay = 0;
  const westminster = westminsterAsset(config.westminster, time);
  if (westminster && targetMatches(config.westminster.mediaPlayers, config.westminster.outputs, runner)) {
    playbacks.push({
      asset: westminster,
      mediaPlayers: config.westminster.mediaPlayers,
      outputs: config.westminster.outputs,
      routineId: 'westminster',
      actionIndex: 0,
      waitBeforeSeconds: 0,
      waitAfterSeconds: 0,
    });
  }
  for (const routine of config.routines) {
    if (!routineMatches(routine, time)) continue;
    for (const [actionIndex, action] of routine.actions.entries()) {
      if (action.type === 'delay') {
        if (playbacks.length) playbacks.at(-1)!.waitAfterSeconds += action.seconds;
        else pendingDelay += action.seconds;
        continue;
      }
      if (!targetMatches(action.mediaPlayers, action.outputs, runner)) continue;
      const asset = await resolveScheduleAsset(action, time.date, config, services, hymnCatalog);
      if (!asset) continue;
      playbacks.push({
        asset,
        mediaPlayers: action.mediaPlayers,
        outputs: action.outputs,
        routineId: routine.id,
        actionIndex,
        waitBeforeSeconds: pendingDelay,
        waitAfterSeconds: 0,
      });
      pendingDelay = 0;
    }
  }
  return playbacks;
}

function targetMatches(mediaPlayers: string[], outputs: string[], runner: ScheduleRunner): boolean {
  if (runner === 'home_assistant') return mediaPlayers.length > 0;
  // With neither target list populated, the API-only path means the platform
  // default output. Explicit native outputs take precedence when supplied.
  return outputs.length > 0 || mediaPlayers.length === 0;
}

async function runNativeSchedule(at: Date | string, outputOverride: string | undefined, services: ServerServices) {
  const hymnCatalog = services.hymnCatalog ?? new HymnCatalog(services.library);
  const stored = currentStoredSchedule(services);
  const time = localScheduleTime(at);
  const actions = await scheduledPlaybacks(time, stored.config, services, hymnCatalog, 'native');
  if (!actions.length) return { due: false as const, actions: [] as SchedulePlayback[] };
  const slotKey = scheduleSlotKey(time, stored.updatedAt, 'native');
  const claimed = services.database.claimScheduleRun(slotKey, JSON.stringify(actions));
  if (!claimed) return { due: true as const, claimed: false as const, slotKey, actions: [] as SchedulePlayback[] };
  try {
    await playScheduledNatively(actions, outputOverride, services);
    services.database.completeScheduleRun(slotKey, 'completed');
    return { due: true as const, claimed: true as const, completed: true as const, slotKey, actions };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    services.database.completeScheduleRun(slotKey, 'failed', message);
    return { due: true as const, claimed: true as const, completed: false as const, slotKey, error: message };
  }
}

async function playScheduledNatively(actions: SchedulePlayback[], outputOverride: string | undefined, services: ServerServices) {
  const available = await discoverOutputs();
  for (const action of actions) {
    if (action.waitBeforeSeconds > 0) await sleepSeconds(action.waitBeforeSeconds);
    const requestedOutputs = outputOverride ? [outputOverride] : action.outputs;
    const targets = requestedOutputs.length
      ? requestedOutputs.map((requested) => available.find((item) => item.id === requested || item.name === requested))
      : [undefined];
    if (targets.some((target, index) => requestedOutputs[index] !== undefined && !target)) {
      throw new Error(`Unknown native output: ${requestedOutputs.find((requested) => !available.some((item) => item.id === requested || item.name === requested))}`);
    }
    for (const target of targets) {
      const result = await services.library.playAsset(action.asset, target);
      services.database.addEvent({ asset: action.asset, output: target?.name, status: 'played' });
      void result;
    }
    if (action.waitAfterSeconds > 0) await sleepSeconds(action.waitAfterSeconds);
  }
}

function sleepSeconds(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function resolveScheduleAsset(
  action: Exclude<ScheduleAction, { type: 'delay' }>,
  date: string,
  config: ScheduleConfig,
  services: ServerServices,
  hymnCatalog: HymnCatalog,
): Promise<string | undefined> {
  if (action.type === 'play') return action.asset;

  const day = config.litcal.enabled
    ? await services.liturgicalCalendar?.getDay(date, config.litcal.calendar)
    : neutralLiturgicalDay(date);
  if (!day || !conditionMatches(day, action)) return action.fallbackAsset;
  const selection = hymnCatalog.selectForDay(day, toHymnQuery(action));
  return selection.asset?.id ?? action.fallbackAsset;
}

function tokensMatch(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

function mimeType(filePath: string): string {
  const extension = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  return (
    (
      {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
      } as Record<string, string>
    )[extension] ?? 'application/octet-stream'
  );
}

function queryFromRequest(value: unknown): Record<string, unknown> {
  const query = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const list = (key: string): string[] | undefined => {
    const raw = query[key];
    if (raw === undefined) return undefined;
    return (Array.isArray(raw) ? raw : String(raw).split(',')).map(String).filter(Boolean);
  };
  return {
    feastIds: list('feastIds'),
    categoryIds: list('categoryIds'),
    seasonIds: list('seasonIds'),
    officeIds: list('officeIds'),
    canonicalHours: list('canonicalHours'),
    tags: list('tags'),
    strategy: stringQuery(query.strategy),
    fixedAssetId: stringQuery(query.fixedAssetId),
    seed: stringQuery(query.seed),
    recentExclusion: numberQuery(query.recentExclusion),
  };
}

const CalendarSchema = z.enum(['general', 'US', 'IT', 'NL', 'VA', 'CA']);

function neutralLiturgicalDay(date: string): LiturgicalDay {
  return { date, season: 'General', seasonIds: ['general'], celebrations: [], source: 'home-assistant-disabled' };
}

function stringQuery(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
function numberQuery(value: unknown): number | undefined {
  return typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : typeof value === 'number'
      ? value
      : undefined;
}
function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
