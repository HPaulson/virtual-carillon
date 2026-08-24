import { bellForPitch, getCarillonBell } from './instrument.js';
import { BELL_PRESETS, BellDefinition, BellPreset, BellRenderOptions, DISTANCE_PROFILES, DistanceProfile, DistanceSettings, ReverbProfile } from './types.js';

export function resolvePreset(preset: string | BellPreset | undefined): BellPreset {
  if (!preset) return BELL_PRESETS.medium;
  if (typeof preset !== 'string') return preset;
  const value = BELL_PRESETS[preset.toLowerCase()];
  if (!value) throw new Error(`Unknown bell preset: ${preset}`);
  return value;
}

/**
 * Modal bell synthesis. The source is a bank of inharmonic resonators rather
 * than a pitched oscillator: every partial has its own frequency, beating pair,
 * and decay. The renderer never uses an event's musical duration as a release
 * envelope; duration is only the length of the audio window requested.
 */
export function synthesizeBell(options: BellRenderOptions = {}): Float32Array {
  const registryBell = options.bellId ? getCarillonBell(options.bellId) : options.pitch ? bellForPitch(options.pitch) : undefined;
  const preset = options.preset ? resolvePreset(options.preset) : undefined;
  const bell = preset ? presetAsDefinition(preset, options.frequency) : registryBell ?? presetAsDefinition(BELL_PRESETS.medium, options.frequency);
  const sampleRate = options.sampleRate ?? 44100;
  const distance = resolveDistance(options.distance ?? options.distanceProfile, options.reverb, options.customDistance);
  const frequency = options.frequency ?? bell.frequency;
  const duration = options.duration ?? bell.tailSeconds + 1.35;
  const frames = Math.max(1, Math.ceil(duration * sampleRate));
  const output = new Float32Array(frames * 2);
  const velocity = clamp(options.velocity ?? 1, 0, 1.5);
  const normalizer = Math.max(1, bell.partials.reduce((sum, partial) => sum + partial.amplitude, 0));

  for (let frame = 0; frame < frames; frame++) {
    const t = frame / sampleRate;
    const attack = 1 - Math.exp(-frame / Math.max(1, bell.attack * sampleRate));
    let modal = 0;
    for (const [index, partial] of bell.partials.entries()) {
      const partialFrequency = frequency * partial.ratio;
      const attenuation = Math.exp(-Math.pow(partialFrequency / distance.highCutHz, 1.12) * 0.7);
      const phase = 2 * Math.PI * partialFrequency * t + (partial.phase ?? index * 0.31);
      const secondMode = Math.sin(phase * (1 + (partial.beating ?? 0.001))) * 0.34;
      const firstMode = Math.sin(phase + (partial.detune ?? 0) * t);
      modal += partial.amplitude * attenuation * (firstMode + secondMode) * Math.exp(-t / partial.decay);
    }
    modal /= normalizer;

    /* The clapper's first few milliseconds are noisy and bright, but distance
       removes most of that attack. It is a damped modal burst, not white noise. */
    const strikeDecay = 0.0045 + bell.size * 0.006;
    const strikeEnvelope = (1 - Math.exp(-frame / Math.max(1, 0.0007 * sampleRate))) * Math.exp(-t / strikeDecay);
    const strike = strikeEnvelope * distance.attackGain * (
      0.62 * Math.sin(2 * Math.PI * frequency * 3.9 * t + 0.7) +
      0.28 * Math.sin(2 * Math.PI * frequency * 6.7 * t + 1.9) +
      0.16 * Math.sin(2 * Math.PI * frequency * 10.3 * t + 2.8)
    );
    const mono = (modal * attack + strike * 0.22) * bell.loudness * velocity * 0.52;
    const pan = bell.stereo * Math.sin(t * 0.31 + 0.2) * distance.stereoSpread / 0.2;
    output[frame * 2] = mono * (1 - pan);
    output[frame * 2 + 1] = mono * (1 + pan);
  }

  return applyDistanceModel(output, sampleRate, distance);
}

export function applyDistanceModel(input: Float32Array, sampleRate: number, settings: DistanceSettings): Float32Array {
  const filtered = new Float32Array(input.length);
  const alpha = Math.exp(-2 * Math.PI * settings.highCutHz / sampleRate);
  let leftState = 0;
  let rightState = 0;
  for (let frame = 0; frame < input.length / 2; frame++) {
    const left = input[frame * 2];
    const right = input[frame * 2 + 1];
    leftState = (1 - alpha) * left + alpha * leftState;
    rightState = (1 - alpha) * right + alpha * rightState;
    filtered[frame * 2] = leftState * settings.gain;
    filtered[frame * 2 + 1] = rightState * settings.gain;
  }

  /* Far-field reflections are a few quiet, fixed outdoor/tower echoes. There
     is no feedback loop and therefore no synthetic cathedral tail. */
  const result = new Float32Array(filtered);
  for (let tap = 0; tap < settings.reflectionDelays.length; tap++) {
    const delay = Math.floor(settings.reflectionDelays[tap] * sampleRate) * 2;
    const gain = settings.reflectionGains[tap] * settings.reflectionMix;
    for (let index = delay; index < filtered.length; index++) result[index] += filtered[index - delay] * gain;
  }
  return result;
}

/** Compatibility wrapper for callers that still use the old room names. */
export function applyReverb(input: Float32Array, sampleRate: number, profile: ReverbProfile): Float32Array {
  if (profile === 'dry') return input;
  const distance: DistanceProfile = profile === 'small-room' ? 'church-grounds' : profile === 'church' ? 'quarter-mile' : profile === 'large-church' ? 'half-mile' : 'one-mile';
  return applyDistanceModel(input, sampleRate, DISTANCE_PROFILES[distance]);
}

function resolveDistance(distance: DistanceProfile | undefined, reverb: ReverbProfile | undefined, customDistance?: Partial<DistanceSettings>): DistanceSettings {
  if (distance && distance !== 'custom') return DISTANCE_PROFILES[distance];
  if (distance === 'custom') return { ...DISTANCE_PROFILES['half-mile'], ...customDistance };
  if (reverb) {
    if (reverb === 'dry') return DISTANCE_PROFILES.near;
    const mapped = reverb === 'small-room' ? 'church-grounds' : reverb === 'church' ? 'quarter-mile' : reverb === 'large-church' ? 'half-mile' : 'one-mile';
    return DISTANCE_PROFILES[mapped];
  }
  return DISTANCE_PROFILES['half-mile'];
}

function presetAsDefinition(preset: BellPreset, frequency?: number): BellDefinition {
  return {
    id: preset.id,
    pitch: 'custom',
    frequency: frequency ?? preset.fundamental,
    instrument: preset.instrument,
    size: preset.instrument === 'tower-bell' || preset.instrument === 'clock-tower' ? 0.85 : 0.42,
    loudness: preset.instrument === 'tower-bell' || preset.instrument === 'clock-tower' ? 1 : 0.72,
    attack: preset.attack,
    tailSeconds: Math.max(preset.duration, ...preset.partials.map((partial) => partial.decay)) * 2.7 + 1,
    stereo: preset.stereo,
    partials: preset.partials,
  };
}

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
