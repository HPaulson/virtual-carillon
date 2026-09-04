import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export interface AudioOutput {
  id: string;
  name: string;
  kind: 'pipewire' | 'bluetooth' | 'local' | 'network';
  available: boolean;
  description?: string;
}
export interface AudioPlayback {
  command: string;
  pid?: number;
  completion: Promise<void>;
}

export async function discoverOutputs(): Promise<AudioOutput[]> {
  const outputs: AudioOutput[] = [];
  if (process.platform === 'linux') {
    const wpctl = await command('wpctl', ['status']);
    if (wpctl) {
      const section = wpctl.split(/Sinks:/i)[1]?.split(/Sources:/i)[0] ?? wpctl;
      for (const line of section.split('\n')) {
        const match = line.match(/\s*([*\u2022]?\s*\d+)\.\s+(.+?)(?:\s+\[vol:|$)/);
        if (match) {
          const name = match[2].trim();
          outputs.push({
            id: match[1].replace(/\D/g, ''),
            name,
            kind: /blue|echo|bluetooth/i.test(name) ? 'bluetooth' : 'pipewire',
            available: true,
          });
        }
      }
    }
    if (!outputs.length) {
      const pactl = await command('pactl', ['list', 'short', 'sinks']);
      for (const line of pactl?.split('\n') ?? []) {
        const fields = line.split('\t');
        if (fields[0] && fields[1])
          outputs.push({
            id: fields[0],
            name: fields[1],
            kind: /blue/i.test(fields[1]) ? 'bluetooth' : 'pipewire',
            available: true,
          });
      }
    }
  } else if (process.platform === 'darwin') {
    outputs.push({
      id: 'default',
      name: 'Default CoreAudio output',
      kind: 'local',
      available: true,
      description: 'Default macOS audio output.',
    });
  }
  return outputs;
}

export async function bluetoothStatus(): Promise<{
  available: boolean;
  devices: Array<{ address: string; name: string; connected: boolean }>;
}> {
  if (process.platform !== 'linux') return { available: false, devices: [] };
  const text = await command('bluetoothctl', ['devices']);
  if (!text) return { available: false, devices: [] };
  const info = await command('bluetoothctl', ['devices', 'Connected']);
  const connected = new Set(
    (info ?? '')
      .split('\n')
      .map((line) => line.split(' ')[1])
      .filter(Boolean),
  );
  return {
    available: true,
    devices: text.split('\n').flatMap((line) => {
      const match = line.match(/^Device\s+(\S+)\s+(.+)$/);
      return match
        ? [{ address: match[1], name: match[2], connected: connected.has(match[1]) }]
        : [];
    }),
  };
}

export async function playWav(filePath: string, output?: AudioOutput): Promise<AudioPlayback> {
  const extension = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  const candidates: Array<[string, string[]]> =
    process.platform === 'linux'
      ? extension === '.wav'
        ? [
            ['pw-play', [filePath]],
            ['paplay', [filePath]],
            ['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'error', filePath]],
          ]
        : [
            ['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'error', filePath]],
            ['pw-play', [filePath]],
          ]
      : [['afplay', [filePath]]];
  for (const [program, args] of candidates)
    if (await executable(program)) {
      const child = execFile(
        program,
        output?.id && program === 'pw-play' ? ['--target', output.id, ...args] : [...args],
      );
      const completion = waitForChild(child);
      // Immediate playback callers intentionally do not await completion, but a
      // handled rejection must still prevent an unhandled-process error.
      void completion.catch(() => undefined);
      return { command: [program, ...args].join(' '), pid: child.pid, completion };
    }
  throw new Error('No supported audio player found (tried pw-play, paplay, ffplay, afplay).');
}

export async function executable(program: string): Promise<boolean> {
  return Boolean(await command('sh', ['-c', `command -v ${program}`]));
}
async function command(program: string, args: string[]): Promise<string | undefined> {
  try {
    return (await execFileAsync(program, args, { timeout: 5000 })).stdout.trim();
  } catch {
    return undefined;
  }
}

function waitForChild(child: ReturnType<typeof execFile>): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Audio player exited with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}`,
          ),
        );
    });
  });
}
