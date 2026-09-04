import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const optionsPath = '/data/options.json';
let options = {};
let supervisorMode = false;
try {
  options = JSON.parse(await readFile(optionsPath, 'utf8'));
  supervisorMode = true;
} catch {
  // The normal Docker Compose deployment has no Supervisor options file.
}

const env = {
  ...process.env,
  ...(supervisorMode
    ? {
        VIRTUAL_CARILLON_HOST: '0.0.0.0',
        VIRTUAL_CARILLON_PORT: '9876',
        VIRTUAL_CARILLON_DATA_DIR: '/data',
      }
    : {}),
};

const optionEnv = {
  api_token: 'VIRTUAL_CARILLON_API_TOKEN',
  distance_profile: 'VIRTUAL_CARILLON_DISTANCE_PROFILE',
  sample_rate: 'VIRTUAL_CARILLON_SAMPLE_RATE',
  litcal_url: 'VIRTUAL_CARILLON_LITCAL_URL',
  litcal_calendar: 'VIRTUAL_CARILLON_LITCAL_CALENDAR',
};
for (const [option, variable] of Object.entries(optionEnv)) {
  if (options[option] !== undefined && options[option] !== null) {
    env[variable] = String(options[option]);
  }
}

const child = spawn('node', ['engine/dist/cli/index.js', 'server'], {
  env,
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
