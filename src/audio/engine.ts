import fs from 'node:fs/promises';
import path from 'node:path';
import { playWav, AudioOutput } from './outputs.js';
import { writeWav } from './wav.js';
import { synthesizeBell } from '../bells/synth.js';
import { BellRenderOptions, DistanceProfile, DistanceSettings } from '../bells/types.js';
import { arrangeForCarillon, CarillonArrangement, CarillonEvent } from '../melodies/arranger.js';
import { Melody, pitchFrequency, scoreFromMelody, Score } from '../melodies/types.js';

/** A time-based event used by clock signals and the public sequence API. */
export interface SequenceEvent {
  /** Event start time in seconds. */
  offset?: number;
  start?: number;
  pitch?: string;
  frequency?: number;
  bellId?: string;
  preset?: string;
  gain?: number;
  velocity?: number;
  /** Performance duration; it never cuts the bell's acoustic tail. */
  duration?: number;
  voice?: string;
  kind?: 'strike' | 'note';
}

export interface RenderOptions { distance?: DistanceProfile; customDistance?: Partial<DistanceSettings>; }

export class AudioEngine {
  private active = new Set<number>();
  constructor(private readonly cacheDir: string, private readonly sampleRate = 44100, private readonly defaultDistance: DistanceProfile = 'half-mile') {}

  get defaultDistanceProfile(): DistanceProfile { return this.defaultDistance; }

  async renderBell(key: string, options: BellRenderOptions = {}): Promise<string> {
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '-');
    const distance = options.distance ?? options.distanceProfile ?? this.defaultDistance;
    const filePath = path.join(this.cacheDir, `${safeKey}-${distanceCacheKey(distance, options.customDistance)}.wav`);
    try { await fs.access(filePath); return filePath; } catch { /* render below */ }
    await writeWav(filePath, synthesizeBell({ ...options, distance, sampleRate: this.sampleRate }), this.sampleRate);
    return filePath;
  }

  async playBell(key: string, options: BellRenderOptions = {}, output?: AudioOutput): Promise<{ filePath: string; command: string }> {
    const filePath = await this.renderBell(key, options);
    const result = await playWav(filePath, output);
    this.track(result);
    return { filePath, command: result.command };
  }

  async renderSequence(key: string, events: SequenceEvent[], duration?: number, options: RenderOptions = {}): Promise<string> {
    const distance = options.distance ?? this.defaultDistance;
    const filePath = path.join(this.cacheDir, `${key.replace(/[^a-z0-9_-]/gi, '-')}-${distanceCacheKey(distance, options.customDistance)}.wav`);
    try { await fs.access(filePath); return filePath; } catch { /* render below */ }
    if (!events.length) throw new Error(`Cannot render empty sequence: ${key}`);

    const waveformCache = new Map<string, Float32Array>();
    const rendered = events.map((event) => {
      const start = event.start ?? event.offset ?? 0;
      const gain = event.gain ?? event.velocity ?? 1;
      const waveformKey = JSON.stringify([event.pitch, event.bellId, event.preset, event.frequency, distance, options.customDistance]);
      let samples = waveformCache.get(waveformKey);
      if (!samples) {
        samples = synthesizeBell({
        pitch: event.pitch,
        bellId: event.bellId,
        preset: event.preset,
        frequency: event.frequency ?? (event.pitch ? pitchFrequency(event.pitch) : undefined),
        velocity: 1,
        distance,
        customDistance: options.customDistance,
        sampleRate: this.sampleRate,
        });
        waveformCache.set(waveformKey, samples);
      }
      return { event, start, samples, gain };
    });
    const tailSeconds = rendered.map(({ start, samples }) => start + samples.length / this.sampleRate / 2);
    const eventEnd = rendered.map(({ event, start }) => start + (event.duration ?? 0));
    const totalSeconds = Math.max(duration ?? 0, ...tailSeconds, ...eventEnd);
    const mix = new Float32Array(Math.max(1, Math.ceil(totalSeconds * this.sampleRate)) * 2);
    for (const { start, samples, gain } of rendered) {
      const first = Math.floor(start * this.sampleRate) * 2;
      for (let index = 0; index < samples.length && first + index < mix.length; index++) mix[first + index] += samples[index] * gain;
    }
    await writeWav(filePath, safetyMaster(mix), this.sampleRate);
    return filePath;
  }

  async renderArrangement(key: string, arrangement: CarillonArrangement, options: RenderOptions = {}): Promise<string> {
    return this.renderSequence(key, arrangement.events.map(toSequenceEvent), arrangement.durationSeconds, options);
  }

  async renderScore(key: string, score: Score, options: RenderOptions = {}): Promise<string> {
    return this.renderArrangement(key, arrangeForCarillon(score), options);
  }

  async renderMelody(key: string, melody: Melody, _preset = 'bright', options: RenderOptions = {}): Promise<string> {
    return this.renderScore(key, scoreFromMelody(melody), options);
  }

  async playFile(filePath: string, output?: AudioOutput): Promise<{ filePath: string; command: string }> {
    const result = await playWav(filePath, output);
    this.track(result);
    return { filePath, command: result.command };
  }

  async playFileAndWait(filePath: string, output?: AudioOutput): Promise<{ filePath: string; command: string }> {
    const result = await playWav(filePath, output);
    this.track(result);
    await result.completion;
    return { filePath, command: result.command };
  }

  stop(): void {
    for (const pid of this.active) try { process.kill(pid); } catch { /* already exited */ }
    this.active.clear();
  }

  private track(result: Awaited<ReturnType<typeof playWav>>): void {
    if (!result.pid) return;
    this.active.add(result.pid);
    void result.completion.then(
      () => this.active.delete(result.pid!),
      () => this.active.delete(result.pid!),
    );
  }
}

function toSequenceEvent(event: CarillonEvent): SequenceEvent {
  return { start: event.startSeconds, pitch: event.pitch, velocity: event.velocity, duration: event.durationSeconds, voice: event.voice, kind: 'note' };
}

export function safetyMaster(samples: Float32Array): Float32Array {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (!peak) return samples;
  const gain = Math.min(1, 0.88 / peak);
  const output = new Float32Array(samples.length);
  let dcLeft = 0;
  let dcRight = 0;
  for (let frame = 0; frame < samples.length / 2; frame++) {
    dcLeft += samples[frame * 2];
    dcRight += samples[frame * 2 + 1];
  }
  dcLeft /= samples.length / 2;
  dcRight /= samples.length / 2;
  for (let frame = 0; frame < samples.length / 2; frame++) {
    output[frame * 2] = clamp((samples[frame * 2] - dcLeft) * gain);
    output[frame * 2 + 1] = clamp((samples[frame * 2 + 1] - dcRight) * gain);
  }
  return output;
}

function clamp(value: number): number { return Math.max(-1, Math.min(1, value)); }

function distanceCacheKey(distance: DistanceProfile, custom?: Partial<DistanceSettings>): string {
  if (distance !== 'custom' || !custom) return distance;
  return `custom-${JSON.stringify(custom).replace(/[^a-z0-9_-]/gi, '').slice(0, 48) || 'half-mile'}`;
}
