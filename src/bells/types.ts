export interface BellPartial {
  /** Ratio to the nominal pitch. Bell partials are intentionally inharmonic. */
  ratio: number;
  amplitude: number;
  decay: number;
  detune?: number;
  phase?: number;
  /** Small frequency spread between the two dominant modes of a real bell. */
  beating?: number;
}

export type BellInstrument = 'tower-bell' | 'clock-bell' | 'clock-tower' | 'carillon' | 'monastery-bell';
export type DistanceProfile = 'near' | 'church-grounds' | 'quarter-mile' | 'half-mile' | 'one-mile' | 'custom';

/** Kept for API compatibility. These names now map to distance presets. */
export type ReverbProfile = 'dry' | 'small-room' | 'church' | 'large-church' | 'cathedral';

export interface DistanceSettings {
  gain: number;
  highCutHz: number;
  attackGain: number;
  reflectionMix: number;
  reflectionDelays: number[];
  reflectionGains: number[];
  stereoSpread: number;
}

export const DISTANCE_PROFILES: Record<Exclude<DistanceProfile, 'custom'>, DistanceSettings> = {
  near: { gain: 0.95, highCutHz: 18000, attackGain: 1, reflectionMix: 0.015, reflectionDelays: [0.012, 0.027], reflectionGains: [0.025, 0.014], stereoSpread: 0.08 },
  'church-grounds': { gain: 0.72, highCutHz: 12500, attackGain: 0.78, reflectionMix: 0.035, reflectionDelays: [0.021, 0.047, 0.083], reflectionGains: [0.04, 0.025, 0.014], stereoSpread: 0.12 },
  'quarter-mile': { gain: 0.5, highCutHz: 9200, attackGain: 0.58, reflectionMix: 0.05, reflectionDelays: [0.034, 0.071, 0.119], reflectionGains: [0.048, 0.03, 0.017], stereoSpread: 0.16 },
  'half-mile': { gain: 0.34, highCutHz: 6800, attackGain: 0.4, reflectionMix: 0.065, reflectionDelays: [0.046, 0.089, 0.143], reflectionGains: [0.055, 0.034, 0.018], stereoSpread: 0.2 },
  'one-mile': { gain: 0.22, highCutHz: 4800, attackGain: 0.24, reflectionMix: 0.08, reflectionDelays: [0.063, 0.117, 0.181], reflectionGains: [0.06, 0.037, 0.021], stereoSpread: 0.25 },
};

export interface BellPreset {
  id: string;
  name: string;
  instrument: BellInstrument;
  fundamental: number;
  duration: number;
  attack: number;
  stereo: number;
  reverb: ReverbProfile;
  partials: BellPartial[];
}

export interface BellDefinition {
  id: string;
  pitch: string;
  frequency: number;
  instrument: BellInstrument;
  /** Relative bell size, used for register-dependent loudness and decay. */
  size: number;
  loudness: number;
  attack: number;
  tailSeconds: number;
  stereo: number;
  partials: BellPartial[];
}

export interface BellRenderOptions {
  pitch?: string;
  bellId?: string;
  frequency?: number;
  duration?: number;
  sampleRate?: number;
  preset?: string | BellPreset;
  /** Default is half-mile, not a cathedral room. */
  distance?: DistanceProfile;
  /** Alias accepted by older callers. */
  distanceProfile?: DistanceProfile;
  customDistance?: Partial<DistanceSettings>;
  reverb?: ReverbProfile;
  velocity?: number;
}

/* Family presets remain useful for test/signal assets; individual carillon notes use the registry. */
export const BELL_PRESETS: Record<string, BellPreset> = {
  small: {
    id: 'small', name: 'Small Bell', instrument: 'monastery-bell', fundamental: 880, duration: 3.8, attack: 0.006, stereo: 0.08, reverb: 'dry',
    partials: [{ ratio: 0.5, amplitude: 0.12, decay: 1.5 }, { ratio: 1, amplitude: 0.82, decay: 2.1 }, { ratio: 1.2, amplitude: 0.42, decay: 1.65 }, { ratio: 1.49, amplitude: 0.28, decay: 1.3 }, { ratio: 2.01, amplitude: 0.2, decay: 0.95 }, { ratio: 2.72, amplitude: 0.12, decay: 0.55 }, { ratio: 4.08, amplitude: 0.07, decay: 0.35 }],
  },
  medium: {
    id: 'medium', name: 'Medium Bell', instrument: 'monastery-bell', fundamental: 523.25, duration: 6, attack: 0.009, stereo: 0.1, reverb: 'dry',
    partials: [{ ratio: 0.5, amplitude: 0.18, decay: 2.5 }, { ratio: 1, amplitude: 0.86, decay: 4.5 }, { ratio: 1.19, amplitude: 0.43, decay: 3.5 }, { ratio: 1.5, amplitude: 0.3, decay: 2.85 }, { ratio: 2.02, amplitude: 0.22, decay: 2.1 }, { ratio: 2.73, amplitude: 0.13, decay: 1.25 }, { ratio: 4.06, amplitude: 0.08, decay: 0.78 }, { ratio: 5.42, amplitude: 0.04, decay: 0.48 }],
  },
  large: {
    id: 'large', name: 'Large Church Bell', instrument: 'tower-bell', fundamental: 261.63, duration: 11, attack: 0.017, stereo: 0.13, reverb: 'church',
    partials: [{ ratio: 0.47, amplitude: 0.31, decay: 7.7 }, { ratio: 1, amplitude: 0.9, decay: 10 }, { ratio: 1.18, amplitude: 0.5, decay: 7.2 }, { ratio: 1.49, amplitude: 0.36, decay: 5.6 }, { ratio: 1.98, amplitude: 0.27, decay: 4.4 }, { ratio: 2.71, amplitude: 0.16, decay: 2.9 }, { ratio: 4.05, amplitude: 0.1, decay: 1.8 }, { ratio: 5.44, amplitude: 0.055, decay: 1.15 }],
  },
  deep: {
    id: 'deep', name: 'Deep Church Bell', instrument: 'tower-bell', fundamental: 174.61, duration: 16, attack: 0.024, stereo: 0.16, reverb: 'church',
    partials: [{ ratio: 0.46, amplitude: 0.38, decay: 12.5 }, { ratio: 1, amplitude: 0.92, decay: 15 }, { ratio: 1.17, amplitude: 0.52, decay: 10.7 }, { ratio: 1.48, amplitude: 0.37, decay: 8.1 }, { ratio: 1.98, amplitude: 0.25, decay: 6.2 }, { ratio: 2.68, amplitude: 0.15, decay: 4 }, { ratio: 3.96, amplitude: 0.1, decay: 2.6 }, { ratio: 5.2, amplitude: 0.06, decay: 1.7 }],
  },
  bright: {
    id: 'bright', name: 'Bright Carillon Bell', instrument: 'carillon', fundamental: 659.25, duration: 4.7, attack: 0.004, stereo: 0.06, reverb: 'dry',
    partials: [{ ratio: 0.5, amplitude: 0.1, decay: 1.8 }, { ratio: 1, amplitude: 0.94, decay: 3.5 }, { ratio: 1.2, amplitude: 0.47, decay: 2.7 }, { ratio: 1.5, amplitude: 0.32, decay: 2.05 }, { ratio: 2.01, amplitude: 0.25, decay: 1.55 }, { ratio: 2.72, amplitude: 0.14, decay: 1.02 }, { ratio: 4.08, amplitude: 0.09, decay: 0.68 }, { ratio: 5.8, amplitude: 0.045, decay: 0.4 }],
  },
  clock: {
    id: 'clock', name: 'Clock Chime Bell', instrument: 'clock-bell', fundamental: 261.63, duration: 5.6, attack: 0.005, stereo: 0.04, reverb: 'small-room',
    partials: [{ ratio: 0.5, amplitude: 0.09, decay: 2.25 }, { ratio: 1, amplitude: 0.94, decay: 4.5 }, { ratio: 1.2, amplitude: 0.39, decay: 3.2 }, { ratio: 1.5, amplitude: 0.29, decay: 2.5 }, { ratio: 2, amplitude: 0.23, decay: 1.85 }, { ratio: 2.75, amplitude: 0.11, decay: 1.05 }, { ratio: 4.1, amplitude: 0.06, decay: 0.62 }],
  },
  'clock-tower': {
    id: 'clock-tower', name: 'Clock Tower Hour Bell', instrument: 'clock-tower', fundamental: 130.81, duration: 12, attack: 0.018, stereo: 0.08, reverb: 'church',
    partials: [{ ratio: 0.47, amplitude: 0.34, decay: 8.8 }, { ratio: 1, amplitude: 0.96, decay: 10.5 }, { ratio: 1.17, amplitude: 0.52, decay: 8 }, { ratio: 1.49, amplitude: 0.37, decay: 6.2 }, { ratio: 1.99, amplitude: 0.28, decay: 4.8 }, { ratio: 2.7, amplitude: 0.16, decay: 3 }, { ratio: 4.05, amplitude: 0.08, decay: 1.75 }],
  },
};
