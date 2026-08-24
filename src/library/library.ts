import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { AudioEngine, RenderOptions, SequenceEvent } from '../audio/engine.js';
import { AudioOutput } from '../audio/outputs.js';
import { BellInstrument, BellRenderOptions } from '../bells/types.js';
import { BUILTIN_HYMNS, HymnAsset } from './hymns.js';
import { createLiturgicalTags, type LiturgicalTags } from '../liturgical/taxonomy.js';

export type AudioAssetType = 'recording' | 'bell' | 'sequence' | 'melody' | 'hymn';
export type AudioAssetSource = 'bundled' | 'user' | 'generated';
export type ContentKind = 'traditional' | 'signal' | 'generated' | 'custom';

export interface AudioAsset {
  id: string;
  name: string;
  type: AudioAssetType;
  source: AudioAssetSource;
  contentKind?: ContentKind;
  license?: string;
  attribution?: string;
  sourceUrl?: string;
  duration?: number;
  tags?: string[];
  liturgicalSeasons?: string[];
  feastTypes?: string[];
  liturgicalTags?: LiturgicalTags;
  instrument?: BellInstrument;
  description?: string;
}

export interface AssetDefinition extends AudioAsset {
  preset?: string;
  frequency?: number;
  events?: SequenceEvent[];
  melody?: HymnAsset['melody'];
  filePath?: string;
}

const PITCHES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  B3: 246.94,
  G3: 196,
  F3: 174.61,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  FSharp4: 369.99,
  F4: 349.23,
  GSharp4: 415.3,
  G4: 392,
};

export const WESTMINSTER_BEAT_SECONDS = 0.62;
/** Big Ben's documented Westminster hour-bell note is E3. */
export const WESTMINSTER_HOUR_FREQUENCY = PITCHES.E3;
export const WESTMINSTER_PHRASES = {
  Q1: ['G#4', 'F#4', 'E4', 'B3'],
  Q2: ['E4', 'G#4', 'F#4', 'B3'],
  Q3: ['G#4', 'E4', 'F#4', 'B3'],
  Q4: ['B3', 'F#4', 'G#4', 'E4'],
  MQ: ['E4', 'F#4', 'G#4', 'E4'],
} as const;

type WestminsterPhrase = keyof typeof WESTMINSTER_PHRASES;
export const WESTMINSTER_QUARTERS: Record<WestminsterQuarter, readonly WestminsterPhrase[]> = {
  Q1: ['Q1'],
  Q2: ['Q2', 'MQ'],
  Q3: ['Q3', 'Q4', 'Q1'],
  Q4: ['Q2', 'MQ', 'Q3', 'Q4'],
} as const;

type WestminsterQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

function westminsterEvents(quarters: WestminsterQuarter[]): SequenceEvent[] {
  const events: SequenceEvent[] = [];
  let phraseOffset = 0;
  for (const quarter of quarters) {
    const phraseNames = WESTMINSTER_QUARTERS[quarter];
    for (const phraseName of phraseNames) {
      const notes = WESTMINSTER_PHRASES[phraseName];
      for (let noteIndex = 0; noteIndex < 4; noteIndex++) {
        const pitch = notes[noteIndex];
        events.push({ offset: phraseOffset + noteIndex * WESTMINSTER_BEAT_SECONDS, pitch, preset: 'clock', duration: 0.5, kind: 'note', gain: noteIndex === 3 ? 1.28 : 1.15, voice: 'clock-chime' });
      }
      phraseOffset += 6 * WESTMINSTER_BEAT_SECONDS;
    }
  }
  return events;
}

function westminsterAsset(id: string, name: string, quarters: WestminsterQuarter[], hour?: number): AssetDefinition {
  const events = westminsterEvents(quarters);
  if (hour !== undefined) {
    const firstStrike = Math.max(...events.map((event) => event.offset ?? 0)) + 3.4;
    for (let index = 0; index < hour; index++) events.push({
      offset: firstStrike + index * 2.35,
      frequency: WESTMINSTER_HOUR_FREQUENCY,
      preset: 'clock-tower',
      duration: 0.5,
      kind: 'strike',
      gain: 1.1,
      voice: 'hour-strike',
    });
  }
  const lastStrike = Math.max(...events.map((event) => event.offset ?? 0));
  const duration = lastStrike + (hour ? 12 : 7);
  return {
    id, name, type: 'sequence', source: 'generated', contentKind: 'traditional', events, duration,
    instrument: 'clock-bell', tags: ['Westminster', 'Clock', 'Clock chime'],
    sourceUrl: 'https://www.mtosmt.org/issues/mto.00.6.4/mto.00.6.4.harrison.html',
    description: 'Big Ben’s Westminster Quarters: quarter phrases built from G♯–F♯–E–B, with the traditional rhythmic phrase and a separate E3 tower-hour bell.',
  };
}

function angelusEvents(groups: number[]): SequenceEvent[] {
  const events: SequenceEvent[] = [];
  let offset = 0;
  for (const count of groups) {
    for (let index = 0; index < count; index++) events.push({ offset: offset + index * 1.05, frequency: 220, preset: 'large', duration: 4.6, kind: 'strike', gain: 0.9 });
    offset += count * 1.05 + 4.2;
  }
  return events;
}

function sequenceDuration(events: SequenceEvent[], extra = 0.5): number { return Math.max(...events.map((event) => (event.offset ?? 0) + (event.duration ?? 0))) + extra; }

function signalAsset(id: string, name: string, preset: string, frequency: number, count: number, spacing: number, description: string): AssetDefinition {
  return {
    id, name, type: 'sequence', source: 'generated', contentKind: 'signal', preset,
    events: Array.from({ length: count }, (_, index) => ({ offset: index * spacing, frequency, preset, duration: preset === 'deep' ? 7.5 : 4.2, kind: 'strike', gain: 0.88 })),
    duration: (count - 1) * spacing + (preset === 'deep' ? 7.5 : 4.2),
    instrument: preset === 'deep' ? 'tower-bell' : 'monastery-bell', tags: ['Divine Office', name.split('·').pop()?.trim() ?? 'Office'], description,
    sourceUrl: 'https://www.newadvent.org/cathen/02418b.htm',
  };
}

export const BUILTIN_ASSETS: AssetDefinition[] = [
  { id: 'test-bell', name: 'Test Bell · Dry Carillon', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'bright', frequency: 523.25, instrument: 'carillon', tags: ['Bell', 'Carillon'], description: 'A dry, tuned carillon bell for checking the output path.' },
  { id: 'small-bell', name: 'Small Monastery Bell', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'small', instrument: 'monastery-bell', tags: ['Bell', 'Monastery'] },
  { id: 'medium-bell', name: 'Medium Monastery Bell', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'medium', instrument: 'monastery-bell', tags: ['Bell', 'Monastery'] },
  { id: 'large-church-bell', name: 'Large Church Tower Bell', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'large', instrument: 'tower-bell', tags: ['Bell', 'Church'] },
  { id: 'deep-church-bell', name: 'Deep Church Tower Bell', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'deep', instrument: 'tower-bell', tags: ['Bell', 'Church'] },
  { id: 'bright-carillon-bell', name: 'Bright Carillon Bell', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'bright', instrument: 'carillon', tags: ['Bell', 'Carillon'] },
  { id: 'clock-bell', name: 'Clock Chime Bell', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'clock', instrument: 'clock-bell', tags: ['Bell', 'Clock'] },
  { id: 'clock-tower-bell', name: 'Clock Tower Hour Bell', type: 'bell', source: 'generated', contentKind: 'generated', preset: 'clock-tower', instrument: 'clock-tower', tags: ['Bell', 'Clock', 'Hour'] },
  westminsterAsset('westminster-quarter', 'Westminster Quarter', ['Q1']),
  westminsterAsset('westminster-half', 'Westminster Half', ['Q2']),
  westminsterAsset('westminster-three-quarter', 'Westminster Three Quarter', ['Q3']),
  westminsterAsset('westminster-hour', 'Westminster Hour · 12 strikes', ['Q4'], 12),
  ...Array.from({ length: 12 }, (_, index) => westminsterAsset(`westminster-hour-${index + 1}`, `Westminster Hour · ${index + 1} strike${index ? 's' : ''}`, ['Q4'], index + 1)),
  { id: 'angelus', name: 'Traditional Angelus · Three groups of three', type: 'sequence', source: 'generated', contentKind: 'traditional', events: angelusEvents([3, 3, 3]), duration: sequenceDuration(angelusEvents([3, 3, 3])), instrument: 'tower-bell', tags: ['Angelus', 'Bell', 'Traditional'], sourceUrl: 'https://www.catholic.com/encyclopedia/angelus-bell', description: 'A traditional Angelus signal: three tolls, a pause, repeated three times. Local practice varies; this is an identifiable traditional pattern rather than a melody.' },
  { id: 'angelus-rome', name: 'Angelus · Roman evening variant', type: 'sequence', source: 'generated', contentKind: 'traditional', events: angelusEvents([3, 4, 5, 1]), duration: sequenceDuration(angelusEvents([3, 4, 5, 1])), instrument: 'tower-bell', tags: ['Angelus', 'Bell', 'Traditional', 'Rome'], sourceUrl: 'https://www.newadvent.org/cathen/02418b.htm', description: 'Roman variant described in the Catholic Encyclopedia: three strokes, pause; four, pause; five, pause; one final stroke.' },
  signalAsset('divine-office-matins', 'Divine Office · Matins signal', 'deep', 174.61, 3, 2.6, 'A configurable bell signal for Matins. The library does not claim a universal canonical melody where local traditions differ.'),
  signalAsset('divine-office-lauds', 'Divine Office · Lauds signal', 'large', 220, 3, 1.8, 'A configurable bell signal for Lauds. The library does not invent a melody for an Office that has no single universal bell tune.'),
  signalAsset('divine-office-vespers', 'Divine Office · Vespers signal', 'large', 220, 3, 1.8, 'A configurable bell signal for Vespers. Replace with a local recording or sequence when a house tradition is known.'),
  signalAsset('divine-office-compline', 'Divine Office · Compline signal', 'deep', 174.61, 1, 0, 'A single deep bell signal for Compline; Office bell customs are local and configurable.'),
  ...BUILTIN_HYMNS,
];

const USER_MANIFEST = 'index.json';
const RECORDING_EXTENSIONS = new Set(['.wav', '.flac', '.mp3', '.ogg', '.m4a', '.aac']);

export interface UserRecordingInput {
  id?: string;
  name: string;
  sourcePath: string;
  type?: 'recording' | 'hymn';
  license?: string;
  attribution?: string;
  sourceUrl?: string;
  tags?: string[];
  liturgicalSeasons?: string[];
  feastTypes?: string[];
  liturgicalTags?: Partial<LiturgicalTags>;
}

export class AssetLibrary {
  private readonly userAssetDir: string;
  private readonly userAssets: AssetDefinition[];

  constructor(private readonly engine: AudioEngine, private readonly cacheDir: string, userAssetDir = path.join(path.dirname(cacheDir), 'assets')) {
    this.userAssetDir = userAssetDir;
    this.userAssets = this.loadUserManifest();
  }

  list(): AssetDefinition[] { return [...BUILTIN_ASSETS, ...this.userAssets].map((asset) => Object.fromEntries(Object.entries(asset).filter(([key]) => key !== 'filePath')) as AssetDefinition); }

  async resolveAndRender(assetId: string, options: RenderOptions = {}): Promise<string> {
    const asset = this.find(assetId);
    if (!asset) throw new Error(`Unknown asset: ${assetId}`);
    if (asset.filePath) return asset.filePath;
    if (asset.type === 'hymn' && asset.melody) return this.engine.renderMelody(asset.id, asset.melody, 'bright', options);
    if (asset.type === 'sequence') {
      // Westminster pitch/register has been tuned against the real Big Ben set;
      // force a fresh render so old cached F3/F4 experiments cannot leak through.
      const renderKey = asset.id.startsWith('westminster-') ? `${asset.id}-big-ben-v1` : asset.id;
      return this.engine.renderSequence(renderKey, asset.events ?? [], asset.duration, options);
    }
    const bellOptions: BellRenderOptions = { preset: asset.preset, frequency: asset.frequency, distance: options.distance, customDistance: options.customDistance };
    return this.engine.renderBell(asset.id, bellOptions);
  }

  async playAsset(assetId: string, output?: AudioOutput, options: RenderOptions = {}) { return this.engine.playFile(await this.resolveAndRender(assetId, options), output); }

  async importRecording(input: UserRecordingInput): Promise<AssetDefinition> {
    const extension = path.extname(input.sourcePath).toLowerCase();
    if (!RECORDING_EXTENSIONS.has(extension)) throw new Error(`Unsupported recording format: ${extension || 'none'}`);
    const source = await fsp.realpath(input.sourcePath);
    const id = sanitiseId(input.id ?? path.basename(source, extension));
    if (BUILTIN_ASSETS.some((asset) => asset.id === id)) throw new Error(`Asset id is reserved by built-in content: ${id}`);
    const fileName = `${id}${extension}`;
    const target = path.join(this.userAssetDir, fileName);
    await fsp.mkdir(this.userAssetDir, { recursive: true });
    await fsp.copyFile(source, target);
    const asset: AssetDefinition = { id, name: input.name, type: input.type ?? 'recording', source: 'user', contentKind: 'custom', filePath: target, tags: input.tags ?? ['Recording'], license: input.license, attribution: input.attribution, sourceUrl: input.sourceUrl, liturgicalSeasons: input.liturgicalSeasons, feastTypes: input.feastTypes, liturgicalTags: input.liturgicalTags ? createLiturgicalTags(input.liturgicalTags) : undefined };
    const existing = this.userAssets.findIndex((entry) => entry.id === id);
    if (existing >= 0) this.userAssets.splice(existing, 1, asset); else this.userAssets.push(asset);
    await this.saveUserManifest();
    return { ...asset };
  }

  async removeUserAsset(assetId: string): Promise<void> {
    const index = this.userAssets.findIndex((asset) => asset.id === assetId);
    if (index < 0) throw new Error(`User asset not found: ${assetId}`);
    const asset = this.userAssets[index];
    if (asset.filePath) await fsp.rm(asset.filePath, { force: true });
    this.userAssets.splice(index, 1);
    await this.saveUserManifest();
  }

  pathFor(id: string) { return path.join(this.cacheDir, `${id}-half-mile.wav`); }

  private find(assetId: string) { return [...BUILTIN_ASSETS, ...this.userAssets].find((entry) => entry.id === assetId); }

  private loadUserManifest(): AssetDefinition[] {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(this.userAssetDir, USER_MANIFEST), 'utf8')) as Array<Omit<AssetDefinition, 'filePath'> & { fileName: string }>;
      return raw.flatMap((entry) => {
        const filePath = path.join(this.userAssetDir, path.basename(entry.fileName));
        return fs.existsSync(filePath) ? [{ ...entry, filePath }] : [];
      });
    } catch { return []; }
  }

  private async saveUserManifest() {
    await fsp.mkdir(this.userAssetDir, { recursive: true });
    await fsp.writeFile(path.join(this.userAssetDir, USER_MANIFEST), JSON.stringify(this.userAssets.map(({ filePath, ...asset }) => ({ ...asset, fileName: filePath ? path.basename(filePath) : undefined })), null, 2));
  }
}

function sanitiseId(value: string): string {
  const id = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!id) throw new Error('Asset id must contain at least one letter or number');
  return id;
}
