import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { AudioEngine } from '../audio/engine.js';
import { bluetoothStatus, discoverOutputs } from '../audio/outputs.js';
import { AssetLibrary } from '../library/library.js';
import { HymnCatalog, HymnQuery } from '../library/catalog.js';
import { CarillonDatabase } from '../database/db.js';
import { Scheduler } from '../scheduler/scheduler.js';
import { ScheduleEntry } from '../scheduler/types.js';
import { platformSummary } from '../configuration/config.js';
import { LiturgicalCalendarClient } from '../liturgical/litcal.js';

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
const LiturgicalSchema = z.object({
  season: z.string().optional(),
  seasons: z.array(z.string()).optional(),
  rank: z.string().optional(),
  feast: z.string().optional(),
  feastIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  offices: z.array(z.string()).optional(),
  canonicalHours: z.array(z.string()).optional(),
  hymnTag: z.string().optional(),
  strategy: z.enum(['fixed', 'sequential', 'random']).optional(),
  rotation: z.enum(['fixed', 'sequential', 'random']).optional(),
  fixedAssetId: z.string().optional(),
  seed: z.union([z.string(), z.number()]).optional(),
  recentExclusion: z.number().int().min(0).optional(),
});
const ScheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  days: z.array(z.number().int().min(0).max(6)),
  time: z.string(),
  asset: z.string(),
  output: z.string().optional(),
  liturgical: LiturgicalSchema.optional(),
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
const HymnSelectSchema = HymnQuerySchema.extend({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
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
  scheduler: Scheduler;
  liturgicalCalendar?: LiturgicalCalendarClient;
  hymnCatalog?: HymnCatalog;
}
export async function createServer(services: ServerServices): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const hymnCatalog = services.hymnCatalog ?? new HymnCatalog(services.library);
  await app.register(cors, { origin: true });
  app.get('/health', async () => ({ ok: true, service: 'virtual-carillon', ...platformSummary() }));
  app.get('/api/status', async () => ({
    ok: true,
    scheduler: { running: services.scheduler.isRunning },
    audio: { defaultDistance: services.engine.defaultDistanceProfile },
    outputs: await discoverOutputs(),
    bluetooth: await bluetoothStatus(),
    recentEvents: services.database.recentEvents(10),
  }));
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
  app.get<{ Params: { date: string } }>('/api/liturgical/:date', async (request) => ({
    enabled: services.liturgicalCalendar?.enabled ?? false,
    day: await services.liturgicalCalendar?.getDay(request.params.date),
  }));
  app.get<{ Params: { date: string } }>('/api/liturgical/:date/hymn', async (request, reply) => {
    const day = await services.liturgicalCalendar?.getDay(request.params.date);
    if (!day)
      return reply.code(404).send({ error: 'No liturgical day is available for this date' });
    return {
      enabled: services.liturgicalCalendar?.enabled ?? false,
      day,
      selection: hymnCatalog.selectForDay(day),
    };
  });
  app.post('/api/hymns/select', async (request, reply) => {
    const parsed = HymnSelectSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { date, ...query } = parsed.data;
    const day = await services.liturgicalCalendar?.getDay(date ?? localDate(new Date()));
    if (!day)
      return reply
        .code(503)
        .send({ error: 'Liturgical calendar is disabled or unavailable for this date' });
    return { day, selection: hymnCatalog.selectForDay(day, query as HymnQuery) };
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
  app.get('/api/schedules', async () => ({ schedules: services.scheduler.getEntries() }));
  app.put('/api/schedules', async (request, reply) => {
    const parsed = z.array(ScheduleSchema).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    services.database.replaceSchedules(parsed.data as ScheduleEntry[]);
    services.scheduler.setEntries(parsed.data as ScheduleEntry[]);
    return { schedules: parsed.data };
  });
  return app;
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
  const list = (primary: string, singular: string): string[] | undefined => {
    const raw = query[primary] ?? query[singular];
    if (raw === undefined) return undefined;
    return (Array.isArray(raw) ? raw : String(raw).split(',')).map(String).filter(Boolean);
  };
  return {
    feastIds: list('feastIds', 'feast'),
    categoryIds: list('categoryIds', 'category'),
    seasonIds: list('seasonIds', 'season'),
    officeIds: list('officeIds', 'office'),
    canonicalHours: list('canonicalHours', 'hour'),
    tags: list('tags', 'tag'),
    strategy: stringQuery(query.strategy),
    fixedAssetId: stringQuery(query.fixedAssetId),
    seed: stringQuery(query.seed),
    recentExclusion: numberQuery(query.recentExclusion),
  };
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
