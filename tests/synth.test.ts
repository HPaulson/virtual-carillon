import { describe, expect, it } from 'vitest';
import { BELL_PRESETS } from '../src/bells/types.js';
import { synthesizeBell } from '../src/bells/synth.js';
import { wavDuration } from '../src/audio/wav.js';
import { AudioEngine } from '../src/audio/engine.js';
import { AssetLibrary } from '../src/library/library.js';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('bell synthesizer', () => {
  it('renders stereo audio with a non-zero attack and decay', () => {
    const samples = synthesizeBell({ preset: 'medium', sampleRate: 8000, duration: 1 });
    expect(samples.length).toBe(16000);
    expect(samples.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
    expect(wavDuration(samples, 8000)).toBe(1);
  });
  it('provides distinct bell instruments', () => {
    expect(Object.keys(BELL_PRESETS)).toEqual([
      'small',
      'medium',
      'large',
      'deep',
      'bright',
      'clock',
      'clock-tower',
    ]);
  });
  it('is deterministic and dry by default for the carillon test bell', () => {
    const first = synthesizeBell({
      preset: 'bright',
      sampleRate: 8000,
      duration: 1,
      reverb: 'dry',
    });
    const second = synthesizeBell({
      preset: 'bright',
      sampleRate: 8000,
      duration: 1,
      reverb: 'dry',
    });
    expect(Array.from(first)).toEqual(Array.from(second));
  });
  it('starts with a clean tonal attack rather than a broadband strike transient', () => {
    const samples = synthesizeBell({
      preset: 'bright',
      sampleRate: 8000,
      duration: 1,
      reverb: 'dry',
    });
    expect(samples[0]).toBe(0);
    expect(samples[1]).toBe(0);
    expect(Math.abs(samples[2])).toBeLessThan(0.02);
    expect(Math.abs(samples[3])).toBeLessThan(0.02);
  });
  it('renders named sequence assets and rejects unknown assets', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'carillon-'));
    const library = new AssetLibrary(new AudioEngine(dir, 8000), dir);
    const file = await library.resolveAndRender('westminster-quarter');
    expect((await readFile(file)).toString('ascii', 0, 4)).toBe('RIFF');
    expect(path.basename(file)).toBe('westminster-quarter-big-ben-v1-half-mile.wav');
    await expect(library.resolveAndRender('not-an-asset')).rejects.toThrow('Unknown asset');
  });
});
