import path from 'node:path';
import { z } from 'zod';

export const AppConfigSchema = z.object({
  dataDir: z.string().default(path.join(process.cwd(), '.data')),
  host: z.string().default('127.0.0.1'),
  port: z.coerce.number().int().min(1).max(65535).default(9876),
  apiToken: z.string().trim().optional(),
  distanceProfile: z
    .enum(['near', 'church-grounds', 'quarter-mile', 'half-mile', 'one-mile'])
    .default('half-mile'),
  sampleRate: z.coerce
    .number()
    .int()
    .refine((v) => [44100, 48000].includes(v), 'Use 44100 or 48000')
    .default(44100),
  litcalUrl: z.string().url().default('https://litcal.johnromanodorazio.com/api/v5'),
  litcalCalendar: z.enum(['general', 'US', 'IT', 'NL', 'VA', 'CA']).default('general'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return AppConfigSchema.parse({
    dataDir: env.VIRTUAL_CARILLON_DATA_DIR,
    host: env.VIRTUAL_CARILLON_HOST,
    port: env.VIRTUAL_CARILLON_PORT,
    apiToken: env.VIRTUAL_CARILLON_API_TOKEN,
    distanceProfile: env.VIRTUAL_CARILLON_DISTANCE_PROFILE,
    sampleRate: env.VIRTUAL_CARILLON_SAMPLE_RATE,
    litcalUrl: env.VIRTUAL_CARILLON_LITCAL_URL,
    litcalCalendar: env.VIRTUAL_CARILLON_LITCAL_CALENDAR,
  });
}

export function defaultDatabasePath(config: AppConfig): string {
  return path.join(config.dataDir, 'carillon.sqlite');
}

export function platformSummary() {
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
  };
}
