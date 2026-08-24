import path from 'node:path';
import { Command } from 'commander';
import { loadConfig, defaultDatabasePath } from '../configuration/config.js';
import { AudioEngine } from '../audio/engine.js';
import { bluetoothStatus, discoverOutputs } from '../audio/outputs.js';
import { AssetLibrary } from '../library/library.js';
import { HymnCatalog } from '../library/catalog.js';
import { CarillonDatabase } from '../database/db.js';
import { createServer } from '../api/server.js';
import { LiturgicalCalendarClient } from '../liturgical/litcal.js';
import { CARILLON_BELLS, CARILLON_RANGE } from '../bells/instrument.js';
import { arrangeForCarillon } from '../melodies/arranger.js';
import { scoreFromMelody } from '../melodies/types.js';
import { wavDurationFromFile } from '../audio/wav.js';
import { cycleHymns } from './hymn-cycle.js';
import { DEFAULT_SCHEDULE_CONFIG, normalizeSchedule, toSimpleSchedule } from '../scheduling/schedule.js';

const config = loadConfig();
const displayConfig = { ...config, apiToken: config.apiToken ? '[configured]' : undefined };
const database = new CarillonDatabase(defaultDatabasePath(config));
const engine = new AudioEngine(path.join(config.dataDir, 'cache'), config.sampleRate);
const library = new AssetLibrary(engine, path.join(config.dataDir, 'cache'), path.join(config.dataDir, 'assets'));
const hymnCatalog = new HymnCatalog(library);
const liturgicalCalendar = new LiturgicalCalendarClient({ cacheDir: path.join(config.dataDir, 'litcal') });

const program = new Command();
program.name('virtual-carillon').description('Virtual Carillon church bell engine').version('0.1.0');
program.command('status').description('Show engine, audio, and Bluetooth status').action(async () => { console.log(JSON.stringify({ config: displayConfig, outputs: await discoverOutputs(), bluetooth: await bluetoothStatus(), recentEvents: database.recentEvents() }, null, 2)); });
program.command('devices').description('Discover PipeWire and Bluetooth outputs').action(async () => console.log(JSON.stringify({ outputs: await discoverOutputs(), bluetooth: await bluetoothStatus() }, null, 2)));
program.command('play').argument('<asset>', 'asset id, for example test-bell').option('-o, --output <output>', 'output id or name').option('-d, --distance <profile>', 'near, church-grounds, quarter-mile, half-mile, one-mile, or custom').action(async (asset, options) => { try { const output = (await discoverOutputs()).find((item) => item.id === options.output || item.name === options.output); const result = await library.playAsset(asset, output, { distance: options.distance }); database.addEvent({ asset, output: output?.name, status: 'played' }); console.log(`Playing ${asset} (${result.filePath}) via ${result.command}`); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; } });
program.command('stop').description('Stop current audio').action(() => { engine.stop(); console.log('Stopped active audio.'); });
program.command('test').description('Render representative bells, clock signals, Angelus, chant, and hymns').action(async () => { for (const asset of ['test-bell', 'large-church-bell', 'deep-church-bell', 'westminster-quarter', 'westminster-hour', 'angelus', 'salve-regina', 'regina-caeli', 'alma-redemptoris-mater', 'ave-regina-caelorum', 'veni-creator-spiritus', 'ave-maris-stella', 'amazing-grace', 'come-thou-fount', 'o-come-all-ye-faithful', 'hark-the-herald-angels-sing', 'o-sacred-head-now-wounded', 'jesus-christ-is-risen-today', 'hymn-to-joy']) { const file = await library.resolveAndRender(asset); console.log(`${asset}: ${file}`); } });
program.command('shuffle-hymns').aliases(['hymns', 'cycle-hymns']).description('Play a shuffled cycle of hymns until stopped').option('-n, --count <number>', 'number of hymns to play; runs continuously when omitted').option('-p, --pause <seconds>', 'pause between hymns in seconds', '0').option('-o, --output <output>', 'output id or name').option('-d, --distance <profile>', 'near, church-grounds, quarter-mile, half-mile, one-mile, or custom').action(async (options) => {
  let stop: (() => void) | undefined;
  try {
    const count = options.count === undefined ? undefined : parsePositiveInteger(options.count, '--count');
    const pauseSeconds = parseNonNegativeNumber(options.pause, '--pause');
    const output = (await discoverOutputs()).find((item) => item.id === options.output || item.name === options.output);
    const hymns = hymnCatalog.list();
    const abortController = new AbortController();
    stop = () => { abortController.abort(); engine.stop(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    await cycleHymns(hymns, async (hymn) => {
      const filePath = await library.resolveAndRender(hymn.id, { distance: options.distance });
      console.log(`Playing hymn ${hymn.name} (${hymn.id})`);
      await engine.playFile(filePath, output);
      database.addEvent({ asset: hymn.id, output: output?.name, status: 'played' });
      return await wavDurationFromFile(filePath);
    }, { count, pauseSeconds, signal: abortController.signal });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (stop) {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
    }
  }
});
program.command('import').description('Import a user recording into the persistent library').requiredOption('--name <name>', 'display name').requiredOption('--file <path>', 'source audio path').option('--id <id>', 'stable asset id').option('--license <license>').option('--attribution <text>').option('--source-url <url>').action(async (options) => { const asset = await library.importRecording({ name: options.name, sourcePath: options.file, id: options.id, license: options.license, attribution: options.attribution, sourceUrl: options.sourceUrl }); console.log(JSON.stringify(asset, null, 2)); });
program.command('doctor').description('Check runtime dependencies and audio capabilities').action(async () => { const outputs = await discoverOutputs(); const bluetooth = await bluetoothStatus(); console.log(JSON.stringify({ config: displayConfig, runtime: { node: process.version, platform: process.platform }, audio: { outputs, supported: outputs.length > 0 }, bluetooth }, null, 2)); });
program.command('instrument').description('Report the virtual carillon range and bell registry').action(() => console.log(JSON.stringify({ range: CARILLON_RANGE, bells: CARILLON_BELLS.map(({ id, pitch, frequency, size, tailSeconds, loudness }) => ({ id, pitch, frequency, size, tailSeconds, loudness })), distanceProfiles: ['near', 'church-grounds', 'quarter-mile', 'half-mile', 'one-mile', 'custom'], defaultDistance: engine.defaultDistanceProfile }, null, 2)));
program.command('diagnose').description('Report normalized score voices, register, and overlap diagnostics').argument('<asset>', 'hymn asset id').action((assetId) => { const asset = library.list().find((item) => item.id === assetId); if (!asset?.melody) throw new Error(`Asset is not a score-backed hymn: ${assetId}`); console.log(JSON.stringify(arrangeForCarillon(scoreFromMelody(asset.melody)).diagnostics, null, 2)); });
program.command('server').description('Run the Home Assistant API server').option('-p, --port <port>', 'port').action(async (options) => { const app = await createServer({ engine, library, database, liturgicalCalendar, hymnCatalog, apiToken: config.apiToken }); await app.listen({ host: config.host, port: options.port ? Number(options.port) : config.port }); console.log(`Virtual Carillon listening on http://${config.host}:${options.port ? Number(options.port) : config.port}`); });
program.command('assets').description('List built-in assets').action(() => console.table(library.list()));
const schedule = program.command('schedule').description('Inspect the server-owned Westminster, asset, and hymn schedule');
schedule.command('show').description('Show the persisted simple schedule').action(() => {
  const stored = database.getSchedule();
  const config = stored ? normalizeSchedule(stored.config) : DEFAULT_SCHEDULE_CONFIG;
  console.log(JSON.stringify(stored ? { ...stored, config: toSimpleSchedule(config) } : { config: toSimpleSchedule(config), updatedAt: 'default' }, null, 2));
});
schedule.command('reset').description('Reset the persisted schedule to disabled defaults').action(() => {
  const stored = database.saveSchedule(DEFAULT_SCHEDULE_CONFIG);
  console.log(JSON.stringify({ ...stored, config: toSimpleSchedule(stored.config) }, null, 2));
});
await program.parseAsync();

function parsePositiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${option} must be a positive integer.`);
  return parsed;
}

function parseNonNegativeNumber(value: string | undefined, option: string): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${option} must be a non-negative number of seconds.`);
  return parsed;
}
