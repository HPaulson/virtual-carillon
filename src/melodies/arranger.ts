import { bellForPitch, CARILLON_RANGE } from '../bells/instrument.js';
import {
  ArrangementPlan,
  ArrangementStyle,
  ChordChange,
  midiToPitch,
  pitchToMidi,
  Score,
  ScoreNote,
} from './types.js';

export interface CarillonEvent {
  pitch: string;
  startSeconds: number;
  durationSeconds: number;
  velocity: number;
  voice: string;
}

export interface ArrangementDiagnostics {
  lowestNote: string;
  highestNote: string;
  melodyLowest: string;
  melodyHighest: string;
  overallRangeSemitones: number;
  voices: string[];
  overlappingEvents: number;
  transposeSemitones: number;
  warnings: string[];
}

export interface CarillonArrangement {
  events: CarillonEvent[];
  durationSeconds: number;
  diagnostics: ArrangementDiagnostics;
}

export interface ArrangerOptions {
  addHarmony?: boolean;
  addBass?: boolean;
  melodyTargetLow?: number;
  melodyTargetHigh?: number;
  arrangement?: ArrangementPlan;
}

type HarmonicFunction = 'tonic' | 'predominant' | 'dominant' | 'modal';

interface HarmonicCandidate {
  rootPc: number;
  quality: ChordChange['quality'];
  degree: number;
  romanNumeral: string;
  function: HarmonicFunction;
  intervals: number[];
  secondaryOf?: number;
}

interface ChordModel extends HarmonicCandidate {
  rootMidi: number;
  startBeat: number;
  durationBeats: number;
  endBeat: number;
  chordPcs: number[];
  melodyActivity: MelodyActivity;
  cadence: boolean;
  finalCadence: boolean;
  voicing: Voicing;
}

interface MelodyActivity {
  onsetCount: number;
  pitchMotion: number;
  activity: number;
  simple: boolean;
  complex: boolean;
  hasLongNote: boolean;
  hasGap: boolean;
}

interface Voicing {
  notes: number[];
}

interface VoiceSpec {
  name: string;
  minimum: number;
  maximum: number;
  center: number;
}

interface PartialVoicing {
  notes: number[];
  cost: number;
}

interface StyleProfile {
  bassGain: number;
  harmonyGain: number;
  innerGain: number;
  upperGain: number;
  bassSustain: number;
  harmonySustain: number;
  motionBeats: number;
  noteLength: number;
  staggerBeats: number;
  passing: boolean;
  octaveAtCadence: boolean;
  flourish: boolean;
  figure: boolean;
}

interface ChantRegister {
  melodyLowest: number;
  melodyHighest: number;
  tonicMidi: number;
  tenorPc: number;
  lowTenor: number;
  supportCeiling: number;
  harmonyRootMinimum: number;
  harmonyRootMaximum: number;
  harmonyMinimum: number;
  harmonyMaximum: number;
  innerMinimum: number;
  innerMaximum: number;
  cadenceMinimum: number;
  cadenceMaximum: number;
  cadenceTonic: number;
  cadenceTenor: number;
}

const MODE_SCALES: Record<number, number[]> = {
  1: [0, 2, 3, 5, 7, 9, 10], // Dorian
  2: [0, 1, 3, 5, 7, 8, 10], // Phrygian
  3: [0, 2, 4, 6, 7, 9, 11], // Lydian
  4: [0, 2, 4, 5, 7, 9, 10], // Mixolydian
  5: [0, 2, 3, 5, 7, 8, 10], // Aeolian
  6: [0, 1, 3, 5, 6, 8, 10], // Locrian
  7: [0, 2, 4, 5, 7, 9, 11], // Ionian
  8: [0, 2, 4, 5, 7, 9, 10], // Hypomixolydian / Mixolydian color
};

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/**
 * Turns a normalized score into a large-carillon setting. The source melody
 * is kept intact; all other events are generated as independent bell lines.
 * Structural chord tones are deliberately shorter than the acoustic bell tail
 * so the renderer supplies the continuity while the arrangement keeps moving.
 */
export function arrangeForCarillon(score: Score, options: ArrangerOptions = {}): CarillonArrangement {
  const source = score.events.filter((event) => event.pitch !== 'rest');
  if (!source.length) throw new Error(`Cannot arrange empty score: ${score.name}`);
  const melody = source.filter((event) => event.voice === 'melody' || event.voice === 'chant' || !event.voice);
  const melodySource = melody.length ? melody : source;
  const shift = chooseWholePieceTranspose(melodySource, options.melodyTargetLow ?? 60, options.melodyTargetHigh ?? 84);
  const secondsPerBeat = 60 / Math.max(24, score.tempoBpm);
  const plan = options.arrangement ?? score.arrangement ?? defaultPlan(score);
  const events: CarillonEvent[] = source.map((event) => convertEvent(event, shift, secondsPerBeat));

  if (options.addHarmony !== false) {
    if (score.rhythmicCharacter === 'free') addChantTexture(events, score, melodySource, shift, secondsPerBeat, plan, options.addBass !== false);
    else addMeteredTexture(events, melodySource, score, shift, secondsPerBeat, plan, options.addBass !== false);
  } else if (options.addBass !== false) {
    addBassLine(events, melodySource, score, shift, secondsPerBeat);
  }

  events.sort((left, right) => left.startSeconds - right.startSeconds || pitchToMidi(left.pitch) - pitchToMidi(right.pitch));
  const diagnostics = diagnose(events, shift);
  const lastEvent = Math.max(...events.map((event) => event.startSeconds));
  const longestTail = Math.max(...events.map((event) => bellForPitch(event.pitch).tailSeconds));
  return { events, durationSeconds: lastEvent + longestTail + 1.8, diagnostics };
}

export function diagnoseArrangement(arrangement: CarillonArrangement): ArrangementDiagnostics {
  return arrangement.diagnostics;
}

function convertEvent(event: ScoreNote, shift: number, secondsPerBeat: number): CarillonEvent {
  const pitch = midiToPitch(pitchToMidi(event.pitch) + shift);
  bellForPitch(pitch);
  return {
    pitch,
    startSeconds: event.startBeat * secondsPerBeat,
    durationSeconds: event.durationBeats * secondsPerBeat,
    velocity: clamp(event.velocity, 0.18, 1),
    voice: event.voice || 'melody',
  };
}

function addMeteredTexture(
  events: CarillonEvent[],
  melody: ScoreNote[],
  score: Score,
  shift: number,
  secondsPerBeat: number,
  plan: ArrangementPlan,
  addBass: boolean,
): void {
  const changes = plan.chords?.length ? plan.chords : inferChordPlan(melody, score, plan.tonic);
  const models = makeChordModels(changes, score, melody, shift, plan);
  if (!models.length) return;
  const profile = styleProfile(plan.style);
  const tonicPc = mod(pitchToMidi(plan.tonic ?? melody[0].pitch) + shift, 12);
  const scale = scaleForMode(score.mode);
  for (const [index, model] of models.entries()) {
    const next = models[index + 1];
    const velocity = chordVelocity(score, model.startBeat, plan.style);
    const start = model.startBeat * secondsPerBeat;
    const duration = model.durationBeats * secondsPerBeat;

    if (addBass) addBassFigure(events, model, next, start, duration, secondsPerBeat, velocity, profile, tonicPc, scale);
    addLowerHarmony(events, model, start, duration, velocity, profile);
    const localProfile = model.melodyActivity.simple && !model.cadence && !model.finalCadence
      ? { ...profile, motionBeats: Math.max(profile.motionBeats * 1.5, model.durationBeats), figure: false }
      : profile;
    addMovingVoice(events, model, next, 2, 'inner-harmony-1', secondsPerBeat, velocity * profile.innerGain, localProfile, tonicPc, scale);
    // A cadence may open the whole choir of bells. Away from a cadence, choose
    // one color voice at most: a lower inner part for active motion, or an
    // upper response for a genuinely sustained/expressive melody. This keeps
    // a busy hymn from turning every interesting bar into a new bell stack.
    const useInnerTwo = model.cadence || shouldUseMovingVoice(model, 3, localProfile);
    const useUpper = model.cadence || (!useInnerTwo && shouldUseMovingVoice(model, 4, localProfile));
    if (useInnerTwo) addMovingVoice(events, model, next, 3, 'inner-harmony-2', secondsPerBeat, velocity * profile.innerGain * 0.9, localProfile, tonicPc, scale);
    if (useUpper) addMovingVoice(events, model, next, 4, 'upper-harmony', secondsPerBeat, velocity * profile.upperGain, localProfile, tonicPc, scale);

    if (localProfile.figure && model.finalCadence) addAlternatingFigure(events, model, secondsPerBeat, velocity, localProfile);
    if (model.cadence) addCadenceTexture(events, model, melody, shift, secondsPerBeat, velocity, profile);
  }

}

function makeChordModels(
  changes: ChordChange[],
  score: Score,
  melody: ScoreNote[],
  shift: number,
  plan: ArrangementPlan,
): ChordModel[] {
  const phraseEnds = plan.cadences?.length ? plan.cadences : score.phrases ?? [];
  const totalBeats = scoreTotalBeats(melody);
  const models: ChordModel[] = changes
    .filter((change) => change.durationBeats > 0)
    .sort((left, right) => left.startBeat - right.startBeat)
    .map((change) => {
      const rootMidi = pitchToMidi(change.root) + shift;
      const intervals = chordIntervals(change.quality);
      const endBeat = change.startBeat + change.durationBeats;
      return {
        rootPc: mod(rootMidi, 12),
        rootMidi,
        quality: change.quality,
        degree: change.degree ?? 0,
        romanNumeral: change.romanNumeral ?? '',
        function: functionForChange(change),
        intervals,
        secondaryOf: undefined,
        startBeat: change.startBeat,
        durationBeats: change.durationBeats,
        endBeat,
        chordPcs: intervals.map((interval) => mod(rootMidi + interval, 12)),
        melodyActivity: analyzeMelodyActivity(melody, change.startBeat, endBeat),
        cadence: phraseEnds.some((beat) => Math.abs(beat - endBeat) < 0.08) || endBeat >= totalBeats - 0.08,
        finalCadence: endBeat >= totalBeats - 0.08,
        voicing: { notes: [] },
      };
    });
  let previous: Voicing | undefined;
  for (const model of models) {
    const melodyAnchor = melodyAnchorAt(melody, model.startBeat, model.endBeat, shift);
    model.voicing = chooseVoicing(model, melodyAnchor, previous);
    previous = model.voicing;
  }
  return models;
}

function addBassFigure(
  events: CarillonEvent[],
  model: ChordModel,
  next: ChordModel | undefined,
  start: number,
  duration: number,
  secondsPerBeat: number,
  velocity: number,
  profile: StyleProfile,
  tonicPc: number,
  scale: number[],
): void {
  const bass = model.voicing.notes[0];
  pushEvent(events, bass, start, Math.max(0.24, duration * profile.bassSustain), velocity * profile.bassGain, 'bass');

  const allowRetrike = model.cadence || (
    model.melodyActivity.complex &&
    model.melodyActivity.hasLongNote &&
    profile.motionBeats <= 0.8
  );
  if (allowRetrike && model.durationBeats >= 4 && profile.bassSustain < 0.9) {
    const pulseBeat = model.startBeat + Math.min(model.durationBeats * 0.52, profile.motionBeats * 1.2);
    const pulsePitch = nearestChordPitch(model, bass + (mod(bass, 12) === model.rootPc ? 7 : -5), 34, 55);
    pushEvent(events, pulsePitch, pulseBeat * secondsPerBeat, Math.min(0.65, model.durationBeats * 0.22) * secondsPerBeat, velocity * profile.bassGain * 0.62, 'bass-restrike');
  }

  if (next && model.cadence && model.durationBeats >= 2 && Math.abs(next.voicing.notes[0] - bass) >= 3) {
    const approach = stepScalePitch(next.voicing.notes[0], bass, tonicPc, scale);
    if (approach !== bass && approach !== next.voicing.notes[0]) {
      pushEvent(events, approach, Math.max(start, (model.endBeat - 0.55) * secondsPerBeat), 0.42 * secondsPerBeat, velocity * 0.28, 'bass-passing');
    }
  }
}

function addLowerHarmony(
  events: CarillonEvent[],
  model: ChordModel,
  start: number,
  duration: number,
  velocity: number,
  profile: StyleProfile,
): void {
  const lower = model.voicing.notes[1];
  const stagger = start < 0.01 ? 0 : Math.min(duration * 0.18, profile.staggerBeats * 0.7);
  pushEvent(events, lower, start + stagger, Math.max(0.25, duration * profile.harmonySustain), velocity * profile.harmonyGain, 'harmony');
  if (model.cadence && (model.melodyActivity.hasLongNote || model.melodyActivity.complex) && model.durationBeats >= 4 && profile.motionBeats <= 1) {
    const second = model.voicing.notes[2];
    pushEvent(events, second, start + duration * 0.52, Math.min(duration * 0.32, 1.25 * duration), velocity * profile.harmonyGain * 0.42, 'harmony-response');
  }
}

function addMovingVoice(
  events: CarillonEvent[],
  model: ChordModel,
  next: ChordModel | undefined,
  voiceIndex: number,
  voiceName: string,
  secondsPerBeat: number,
  velocity: number,
  profile: StyleProfile,
  tonicPc: number,
  scale: number[],
): void {
  const range = voiceRange(voiceIndex);
  // A voice normally states one carefully chosen chord tone for the whole
  // change. Extra articulation is reserved for a cadence, a long melody note,
  // or a genuinely flowing/celebratory passage; never subdivide by default.
  const activeMelody = model.melodyActivity.complex && model.melodyActivity.activity >= 0.55;
  const canMoveWithinChord = activeMelody && model.durationBeats >= 4 && profile.motionBeats <= 0.8 && (
    model.cadence || (
      mod(model.startBeat, 8) < 0.05 &&
      (model.melodyActivity.hasLongNote || model.melodyActivity.hasGap)
    )
  );
  const segmentCount = canMoveWithinChord ? 2 : 1;
  const segmentBeats = model.durationBeats / segmentCount;
  const stagger = model.startBeat < 0.01 && (voiceIndex === 2 || voiceIndex === 3)
    ? 0
    : Math.min(segmentBeats * 0.22, profile.staggerBeats * (0.75 + voiceIndex * 0.08));
  let previousPitch = model.voicing.notes[voiceIndex];

  for (let index = 0; index < segmentCount; index++) {
    const rawStart = model.startBeat + index * segmentBeats;
    const segmentEnd = model.startBeat + (index + 1) * segmentBeats;
    const startBeat = rawStart + Math.min(stagger, Math.max(0, (segmentEnd - rawStart) * 0.3));
    const target = segmentCount === 1
      ? model.voicing.notes[voiceIndex]
      : index === segmentCount - 1 && next
        ? next.voicing.notes[voiceIndex]
        : model.voicing.notes[voiceIndex];
    const pitch = nearestChordPitch(model, target, range.minimum, range.maximum);
    const noteDuration = Math.max(0.14, Math.min(segmentEnd - startBeat, segmentBeats * profile.noteLength));
    pushEvent(events, pitch, startBeat * secondsPerBeat, noteDuration * secondsPerBeat, velocity * (index === 0 ? 0.95 : 0.82), voiceName);

    if (profile.passing && model.cadence && index > 0 && Math.abs(pitch - previousPitch) >= 3 && segmentBeats >= 0.7) {
      const passing = stepScalePitch(pitch, previousPitch, tonicPc, scale);
      if (passing !== previousPitch && passing !== pitch) {
        const passingStart = Math.max(rawStart, startBeat - segmentBeats * 0.35);
        pushEvent(events, clampMidi(passing, range.minimum, range.maximum), passingStart * secondsPerBeat, Math.min(0.42, segmentBeats * 0.34) * secondsPerBeat, velocity * 0.34, 'passing-tone');
      }
    }
    previousPitch = pitch;
  }
}

function addAlternatingFigure(events: CarillonEvent[], model: ChordModel, secondsPerBeat: number, velocity: number, profile: StyleProfile): void {
  const tones = model.voicing.notes.slice(2).reverse();
  if (tones.length < 2 || model.durationBeats < 2) return;
  const count = model.finalCadence && profile.flourish ? 3 : 2;
  const offsets = count === 3 ? [0.56, 0.72, 0.86] : [0.62, 0.82];
  for (const [index, offset] of offsets.entries()) {
    const beat = Math.min(model.durationBeats - 0.2, model.durationBeats * offset);
    const pitch = tones[index % tones.length] + (model.finalCadence && index === count - 1 ? 12 : 0);
    pushEvent(events, pitch, (model.startBeat + beat) * secondsPerBeat, Math.min(0.5, model.durationBeats * 0.12) * secondsPerBeat, velocity * profile.upperGain * 0.34, 'alternating-figure');
  }
}

function shouldUseMovingVoice(model: ChordModel, voiceIndex: number, profile: StyleProfile): boolean {
  if (model.cadence || model.finalCadence) return true;
  if (profile.motionBeats > 0.8 || !model.melodyActivity.complex || model.melodyActivity.activity < 0.55) return false;
  // A fast passage may earn a color voice, but give the ear several beats to
  // hear the harmony first. The eight-beat cycle is deliberately a ceiling,
  // not a request to add a figure every bar.
  if (mod(model.startBeat, 8) >= 0.05) return false;
  // Give a sustained active phrase an upper answer; otherwise the lower
  // inner part supplies the single extra color voice.
  if (voiceIndex === 4) return model.melodyActivity.hasLongNote;
  return voiceIndex === 3 && !model.melodyActivity.hasLongNote;
}

function addCadenceTexture(
  events: CarillonEvent[],
  model: ChordModel,
  melody: ScoreNote[],
  shift: number,
  secondsPerBeat: number,
  velocity: number,
  profile: StyleProfile,
): void {
  if (profile.octaveAtCadence) {
    const cadenceNotes = melody.filter((note) => note.startBeat + note.durationBeats > model.endBeat - Math.min(2, model.durationBeats) && note.startBeat < model.endBeat + 0.01);
    const note = cadenceNotes.at(-1);
    if (note) {
      const doubled = pitchToMidi(note.pitch) + shift + 12;
      if (doubled <= CARILLON_RANGE.highestMidi) {
        pushEvent(events, doubled, Math.max(model.startBeat, note.startBeat - 0.04) * secondsPerBeat, Math.min(note.durationBeats, model.endBeat - note.startBeat + 0.1) * secondsPerBeat, velocity * 0.22, 'melody-doubling');
      }
    }
  }

  if (!model.finalCadence) return;

  if (profile.flourish) {
    const flourishBeats = Math.min(2.5, Math.max(0.5, model.durationBeats));
    const sequence = profile.motionBeats <= 0.8 ? [4, 7, 0] : [7, 0];
    const step = flourishBeats / sequence.length;
    const start = model.endBeat - flourishBeats;
    for (const [index, interval] of sequence.entries()) {
      const pitch = nearestChordPitch(model, model.rootMidi + interval + (index >= sequence.length - 2 ? 12 : 0), 68, 98);
      pushEvent(events, pitch, (start + index * step) * secondsPerBeat, Math.min(step * 0.62, 0.5) * secondsPerBeat, velocity * (profile.motionBeats <= 0.8 ? 0.28 : 0.2), 'cadential-flourish');
    }
  }

  const finalOctave = nearestChordPitch(model, model.rootMidi + 24, 72, CARILLON_RANGE.highestMidi);
  pushEvent(events, finalOctave, Math.max(model.startBeat, model.endBeat - Math.min(0.18, model.durationBeats * 0.12)) * secondsPerBeat, Math.min(1.1, model.durationBeats * 0.32) * secondsPerBeat, velocity * (profile.flourish ? 0.2 : 0.15), 'cadence-octave');
}

/**
 * Infer a harmonic plan from the whole melodic context. Each segment is
 * scored against the notes it contains, the metric accents, the previous
 * function, and the next phrase boundary. Phrase ends are then rewritten as
 * deliberate predominant–dominant–tonic (or modal) cadences.
 */
export function inferChordPlan(melody: ScoreNote[], score: Score, tonicPitch?: string): ChordChange[] {
  if (!melody.length) return [];
  const barBeats = Math.max(1, score.meter.numerator * (4 / score.meter.denominator));
  const totalBeats = scoreTotalBeats(melody);
  const tonicMidi = pitchToMidi(tonicPitch ?? melody[0].pitch);
  const tonicPc = mod(tonicMidi, 12);
  const scale = scaleForMode(score.mode);
  const phraseEnds = [...new Set((score.phrases ?? []).filter((beat) => beat > 0 && beat < totalBeats + 0.08))].sort((a, b) => a - b);
  const boundaries = new Set<number>([0, totalBeats]);

  for (let beat = 0; beat < totalBeats; beat += barBeats) boundaries.add(roundBeat(Math.min(totalBeats, beat)));
  for (const end of phraseEnds) {
    boundaries.add(roundBeat(end));
    const phraseStart = phraseEnds.filter((candidate) => candidate < end).at(-1) ?? 0;
    const phraseLength = end - phraseStart;
    if (phraseLength >= barBeats * 2) boundaries.add(roundBeat(end - barBeats));
    if (phraseLength >= barBeats * 2.5) boundaries.add(roundBeat(end - barBeats * 2));
    if (phraseLength >= 3) {
      boundaries.add(roundBeat(end - 2));
      boundaries.add(roundBeat(end - 1));
    }
  }

  const ordered = [...boundaries].filter((beat) => beat >= 0 && beat <= totalBeats).sort((a, b) => a - b);
  const changes: ChordChange[] = [];
  let previous: HarmonicCandidate | undefined;
  for (let index = 0; index < ordered.length - 1; index++) {
    const startBeat = ordered[index];
    const durationBeats = ordered[index + 1] - startBeat;
    if (durationBeats < 0.1) continue;
    const candidates = harmonicCandidates(tonicPc, scale, score.mode, index > 0 && changes[index - 1]?.degree === 5);
    const selected = candidates
      .map((candidate) => ({ candidate, score: scoreCandidate(candidate, melody, startBeat, startBeat + durationBeats, tonicPc, previous, phraseEnds) }))
      .sort((left, right) => right.score - left.score)[0]?.candidate ?? candidates[0];
    if (!selected) continue;
    changes.push(candidateToChange(selected, startBeat, durationBeats, tonicMidi));
    previous = selected;
  }

  applyPhraseCadences(changes, phraseEnds, totalBeats, tonicPc, scale, tonicMidi, score.mode);
  applySecondaryDominants(changes, melody, tonicPc, scale, tonicMidi, score.mode);
  sanitizeSecondaryDominants(changes, melody, tonicPc, scale, tonicMidi, score.mode);
  return changes;
}

function applySecondaryDominants(
  changes: ChordChange[],
  melody: ScoreNote[],
  tonicPc: number,
  scale: number[],
  tonicMidi: number,
  mode: number | undefined,
): void {
  if (mode !== undefined && mode !== 7) return;
  const secondary = harmonicCandidates(tonicPc, scale, mode, false).find((candidate) => candidate.secondaryOf === 5);
  if (!secondary) return;
  for (let index = 0; index < changes.length - 1; index++) {
    if (changes[index + 1].degree !== 5) continue;
    const current = changes[index];
    const notes = melody.filter((note) => note.startBeat < current.startBeat + current.durationBeats && note.startBeat + note.durationBeats > current.startBeat);
    const containsSecondaryThird = notes.some((note) => mod(pitchToMidi(note.pitch) - secondary.rootPc, 12) === 4);
    if (containsSecondaryThird) overwriteChange(current, secondary, tonicMidi);
  }
}

function sanitizeSecondaryDominants(
  changes: ChordChange[],
  melody: ScoreNote[],
  tonicPc: number,
  scale: number[],
  tonicMidi: number,
  mode: number | undefined,
): void {
  if (mode !== undefined && mode !== 7) return;
  const secondaryRoot = mod(tonicPc + scale[1], 12);
  const ii = diatonicCandidate(2, tonicPc, scale, mode);
  if (!ii) return;
  for (let index = 0; index < changes.length; index++) {
    const change = changes[index];
    if (change.romanNumeral !== 'V/V') continue;
    const next = changes[index + 1];
    const notes = melody.filter((note) => note.startBeat < change.startBeat + change.durationBeats && note.startBeat + note.durationBeats > change.startBeat);
    const hasSecondaryThird = notes.some((note) => mod(pitchToMidi(note.pitch) - secondaryRoot, 12) === 4);
    if (next?.degree !== 5 || !hasSecondaryThird) overwriteChange(change, ii, tonicMidi);
  }
}

function applyPhraseCadences(
  changes: ChordChange[],
  phraseEnds: number[],
  totalBeats: number,
  tonicPc: number,
  scale: number[],
  tonicMidi: number,
  mode: number | undefined,
): void {
  for (const phraseEnd of [...phraseEnds, totalBeats]) {
    const ending = changes.filter((change) => Math.abs(change.startBeat + change.durationBeats - phraseEnd) < 0.08);
    if (!ending.length) continue;
    const final = ending.at(-1)!;
    const inPhrase = changes.filter((change) => change.startBeat < phraseEnd && change.startBeat + change.durationBeats > phraseEnd - Math.max(4, final.durationBeats * 2.2));
    const finalPitch = finalChordEndpoint(changes, phraseEnd, tonicPc);
    const cadenceRoot = finalPitch === 7 || finalPitch === 2 ? 5 : 1;
    if (inPhrase.length >= 3) {
      const [predominant, dominant, tonic] = inPhrase.slice(-3);
      overwriteChange(predominant, cadenceCandidate(2, 'predominant', tonicPc, scale, mode), tonicMidi);
      overwriteChange(dominant, cadenceCandidate(5, 'dominant', tonicPc, scale, mode), tonicMidi);
      overwriteChange(tonic, cadenceCandidate(cadenceRoot, cadenceRoot === 1 ? 'tonic' : 'dominant', tonicPc, scale, mode), tonicMidi);
    } else if (inPhrase.length >= 2) {
      const [dominant, tonic] = inPhrase.slice(-2);
      overwriteChange(dominant, cadenceCandidate(4, 'predominant', tonicPc, scale, mode), tonicMidi);
      overwriteChange(tonic, cadenceCandidate(cadenceRoot, cadenceRoot === 1 ? 'tonic' : 'dominant', tonicPc, scale, mode), tonicMidi);
    } else {
      overwriteChange(final, cadenceCandidate(cadenceRoot, cadenceRoot === 1 ? 'tonic' : 'dominant', tonicPc, scale, mode), tonicMidi);
    }
  }
}

function harmonicCandidates(tonicPc: number, scale: number[], mode: number | undefined, emphasizeDominant: boolean): HarmonicCandidate[] {
  const candidates: HarmonicCandidate[] = [];
  for (let degree = 1; degree <= 7; degree++) {
    const candidate = diatonicCandidate(degree, tonicPc, scale, mode);
    if (candidate) candidates.push(candidate);
  }
  if (mode === undefined || mode === 7) {
    candidates.push({
      rootPc: mod(tonicPc + scale[1], 12), degree: 2, quality: 'dominant', romanNumeral: 'V/V', function: 'dominant', intervals: [0, 4, 7, 10], secondaryOf: 5,
    });
  }
  if (emphasizeDominant) candidates.sort((left, right) => (right.degree === 5 ? 1 : 0) - (left.degree === 5 ? 1 : 0));
  return candidates;
}

function scoreCandidate(
  candidate: HarmonicCandidate,
  melody: ScoreNote[],
  startBeat: number,
  endBeat: number,
  tonicPc: number,
  previous: HarmonicCandidate | undefined,
  phraseEnds: number[],
): number {
  const notes = melody.filter((note) => note.startBeat < endBeat && note.startBeat + note.durationBeats > startBeat);
  let score = candidate.secondaryOf ? -1.5 : 0;
  for (const note of notes) {
    const overlap = Math.min(endBeat, note.startBeat + note.durationBeats) - Math.max(startBeat, note.startBeat);
    const weight = Math.max(0.25, overlap) * (note.startBeat <= startBeat + 0.05 ? 1.5 : 1);
    const pitch = pitchToMidi(note.pitch);
    const relative = mod(pitch - tonicPc, 12);
    const chordContainsMelody = candidate.intervals.some((interval) => mod(candidate.rootPc + interval - pitch, 12) === 0);
    const isAnchor = note.startBeat <= startBeat + 0.05 || note.startBeat + note.durationBeats >= endBeat - 0.08 || note.durationBeats >= 2;
    if (chordContainsMelody) score += (isAnchor ? 4.2 : 2.7) * weight;
    else score -= (isAnchor ? 6.5 : 1.3) * weight;
    if (relative === mod(candidate.rootPc - tonicPc, 12)) score += 1.5 * weight;
    if (note.startBeat + note.durationBeats >= endBeat - 0.08) {
      if (relative === mod(candidate.rootPc - tonicPc, 12)) score += 3.5;
      else if (candidate.intervals.slice(1).some((interval) => mod(candidate.rootPc + interval - pitch, 12) === 0)) score += 1.3;
    }
  }
  if (previous) {
    if (previous.degree === 5 && candidate.degree === 1) score += 8;
    if ((previous.degree === 2 || previous.degree === 4) && candidate.degree === 5) score += 4;
    if (previous.degree === candidate.degree && !candidate.secondaryOf) score -= 2.2;
    if (previous.function === 'tonic' && candidate.function === 'predominant') score += 1.5;
  }
  if (phraseEnds.some((end) => Math.abs(end - endBeat) < 0.08)) {
    if (candidate.degree === 1) score += 2.5;
    if (candidate.degree === 5) score += 1.2;
    if (candidate.function === 'predominant') score += 0.8;
  }
  if (candidate.secondaryOf) score += notes.some((note) => mod(pitchToMidi(note.pitch) - candidate.rootPc, 12) === 4) ? 3 : 0;
  return score;
}

function diatonicCandidate(degree: number, tonicPc: number, scale: number[], mode: number | undefined): HarmonicCandidate | undefined {
  const rootPc = mod(tonicPc + scale[degree - 1], 12);
  const third = mod(scale[(degree + 1) % 7] - scale[degree - 1], 12);
  const fifth = mod(scale[(degree + 3) % 7] - scale[degree - 1], 12);
  const quality: ChordChange['quality'] = third === 3 && fifth === 6 ? 'diminished' : third === 3 ? 'minor' : third === 4 ? 'major' : 'sus4';
  const functionalQuality = degree === 5 && (mode === undefined || mode === 7 || mode === 5) ? 'dominant' : quality;
  const intervals = chordIntervals(functionalQuality);
  return {
    rootPc,
    quality: functionalQuality,
    degree,
    romanNumeral: romanNumeral(degree, quality === 'diminished'),
    function: degree === 1 || degree === 3 || degree === 6 ? 'tonic' : degree === 5 ? 'dominant' : 'predominant',
    intervals,
  };
}

function cadenceCandidate(degree: number, functionName: HarmonicFunction, tonicPc: number, scale: number[], mode: number | undefined): HarmonicCandidate {
  const candidate = diatonicCandidate(degree, tonicPc, scale, mode)!;
  if (degree === 5) {
    candidate.quality = 'dominant';
    candidate.intervals = chordIntervals('dominant');
  }
  candidate.function = functionName;
  return candidate;
}

function candidateToChange(candidate: HarmonicCandidate, startBeat: number, durationBeats: number, tonicMidi: number): ChordChange {
  return {
    root: midiToPitch(rootPitchForPc(candidate.rootPc, tonicMidi)),
    quality: candidate.quality,
    startBeat,
    durationBeats,
    romanNumeral: candidate.romanNumeral,
    degree: candidate.degree,
  };
}

function overwriteChange(change: ChordChange, candidate: HarmonicCandidate, tonicMidi: number): void {
  const replacement = candidateToChange(candidate, change.startBeat, change.durationBeats, tonicMidi);
  Object.assign(change, replacement);
}

function chooseVoicing(model: ChordModel, melodyAnchor: number, previous: Voicing | undefined): Voicing {
  // Compress the accompaniment down when the melody sits low. This keeps the
  // upper harmony below the tune instead of allowing a unison or a crossing.
  const upperMaximum = clampMidi(melodyAnchor - 2, 60, 84);
  const upperMinimum = Math.max(55, upperMaximum - 5);
  const innerTwoMaximum = upperMinimum - 1;
  const innerTwoMinimum = Math.max(48, innerTwoMaximum - 7);
  const innerOneMaximum = innerTwoMinimum - 1;
  const innerOneMinimum = Math.max(40, innerOneMaximum - 7);
  const lowerMaximum = innerOneMinimum - 1;
  const lowerMinimum = Math.max(32, lowerMaximum - 7);
  const bassMaximum = lowerMinimum - 1;
  const nominalBassMinimum = Math.max(24, bassMaximum - 10);
  const bassRange = bassRangeForContext(
    nominalBassMinimum,
    bassMaximum,
    lowerMaximum,
    previous?.notes[0],
    model,
    model.cadence || model.finalCadence,
  );
  const specs: VoiceSpec[] = [
    { name: 'bass', minimum: bassRange.minimum, maximum: bassRange.maximum, center: bassMaximum - 4 },
    { name: 'harmony', minimum: lowerMinimum, maximum: lowerMaximum, center: lowerMinimum + 3 },
    { name: 'inner-harmony-1', minimum: innerOneMinimum, maximum: innerOneMaximum, center: innerOneMinimum + 3 },
    { name: 'inner-harmony-2', minimum: innerTwoMinimum, maximum: innerTwoMaximum, center: innerTwoMinimum + 3 },
    { name: 'upper-harmony', minimum: upperMinimum, maximum: upperMaximum, center: upperMinimum + 3 },
  ];
  let beam: PartialVoicing[] = [{ notes: [], cost: 0 }];
  for (const [index, spec] of specs.entries()) {
    const candidates = candidatePitches(model, spec, previous?.notes[index]);
    const expanded: PartialVoicing[] = [];
    for (const partial of beam) {
      for (const note of candidates) {
        const last = partial.notes.at(-1);
        let cost = partial.cost + movementCost(
          note,
          previous?.notes[index],
          spec.center,
          index === 0,
          model.cadence || model.finalCadence,
        );
        if (index === 0) cost += bassRootPreferenceCost(note, candidates, model, previous?.notes[0]);
        // The core accompaniment should spread the available chord tones
        // before it repeats one. Upper color may double a tone occasionally,
        // but bass/harmony/inner voices should not collapse into octaves of
        // the same pitch while another chord tone is missing.
        if (partial.notes.some((existing) => mod(existing - note, 12) === 0)) cost += index >= 4 ? 3 : 8;
        if (last !== undefined) {
          if (note <= last) cost += 40;
          if (note - last < 4) cost += (4 - (note - last)) * 2;
          if (note - last > 19) cost += (note - last - 19) * 0.45;
        }
        expanded.push({ notes: [...partial.notes, note], cost });
      }
    }
    expanded.sort((left, right) => left.cost - right.cost);
    beam = expanded.slice(0, 64);
  }
  const best = beam.sort((left, right) => voicingTotalCost(left, right, previous))[0];
  return { notes: best?.notes ?? specs.map((spec) => nearestChordPitch(model, spec.center, spec.minimum, spec.maximum)) };
}

function candidatePitches(model: ChordModel, spec: VoiceSpec, previous: number | undefined): number[] {
  const pitches: number[] = [];
  for (const pitchClass of model.chordPcs) {
    for (let pitch = spec.minimum; pitch <= spec.maximum; pitch++) {
      if (mod(pitch, 12) === pitchClass) pitches.push(pitch);
    }
  }
  return [...new Set(pitches)].sort((left, right) => {
    const leftCost = Math.abs(left - (previous ?? spec.center)) + (mod(left, 12) === model.rootPc ? -1.5 : 0);
    const rightCost = Math.abs(right - (previous ?? spec.center)) + (mod(right, 12) === model.rootPc ? -1.5 : 0);
    return leftCost - rightCost;
  }).slice(0, 9);
}

function bassRangeForContext(
  minimum: number,
  maximum: number,
  lowerMaximum: number,
  previous: number | undefined,
  model: ChordModel,
  intentionalLeap: boolean,
): { minimum: number; maximum: number } {
  if (previous === undefined || intentionalLeap) return { minimum, maximum };

  // The melody-relative ranges above are useful for keeping the accompaniment
  // below a low tune, but a sudden local contraction can otherwise remove the
  // nearby root/fifth from the bass entirely. Only preserve adjacent register
  // context when that outside chord tone is materially closer than every tone
  // still inside the normal window.
  const nearby = chordPitchesNear(model, previous, 4);
  const inRangeDistance = Math.min(
    ...nearby.filter((pitch) => pitch >= minimum && pitch <= maximum).map((pitch) => Math.abs(pitch - previous)),
    Infinity,
  );
  const outside = nearby
    .filter((pitch) => pitch < minimum || pitch > maximum)
    .sort((left, right) => Math.abs(left - previous) - Math.abs(right - previous))[0];
  const outsideDistance = outside === undefined ? Infinity : Math.abs(outside - previous);
  const preserveContext = outside !== undefined
    && outside > maximum
    && outsideDistance <= 3
    && inRangeDistance - outsideDistance >= 3
    && isBassFoundationTone(outside, model);
  const contextualMaximum = preserveContext ? Math.min(lowerMaximum - 3, outside!) : maximum;
  return {
    minimum,
    maximum: contextualMaximum,
  };
}

function chordPitchesNear(model: ChordModel, target: number, distance: number): number[] {
  const pitches: number[] = [];
  for (let pitch = Math.max(24, target - distance); pitch <= Math.min(96, target + distance); pitch++) {
    if (model.chordPcs.includes(mod(pitch, 12))) pitches.push(pitch);
  }
  return pitches;
}

function isBassFoundationTone(pitch: number, model: ChordModel): boolean {
  return mod(pitch, 12) === model.rootPc || mod(pitch - model.rootPc, 12) === 7;
}

function bassRootPreferenceCost(
  note: number,
  candidates: number[],
  model: ChordModel,
  previous: number | undefined,
): number {
  if (mod(note, 12) === model.rootPc) return 0;
  const rootCandidate = candidates.find((candidate) => mod(candidate, 12) === model.rootPc);
  if (rootCandidate === undefined || previous === undefined) return 3;

  // Keep the root preference when it is musically competitive. If an
  // inversion is several semitones closer to the preceding bass, however,
  // the root surcharge must not manufacture an isolated low note.
  const rootDistance = Math.abs(rootCandidate - previous);
  const candidateDistance = Math.abs(note - previous);
  const deepRegisterLimit = CARILLON_RANGE.lowestMidi + 11;
  return rootCandidate <= deepRegisterLimit && rootCandidate < previous - 4 && rootDistance - candidateDistance >= 3
    ? 0.75
    : 3;
}

function voicingTotalCost(left: PartialVoicing, right: PartialVoicing, previous: Voicing | undefined): number {
  const leftParallel = previous ? parallelMotionCost(left.notes, previous.notes) : 0;
  const rightParallel = previous ? parallelMotionCost(right.notes, previous.notes) : 0;
  return left.cost + leftParallel - (right.cost + rightParallel);
}

function parallelMotionCost(current: number[], previous: number[]): number {
  let cost = 0;
  for (let index = 1; index < Math.min(current.length, previous.length); index++) {
    const currentMotion = current[index] - previous[index];
    const lowerMotion = current[index - 1] - previous[index - 1];
    const currentInterval = mod(current[index] - current[index - 1], 12);
    const previousInterval = mod(previous[index] - previous[index - 1], 12);
    if (Math.sign(currentMotion) === Math.sign(lowerMotion) && Math.abs(currentMotion) > 0 && Math.abs(lowerMotion) > 0) cost += 1.4;
    if ((currentInterval === 0 || currentInterval === 7 || currentInterval === 5) && currentInterval === previousInterval) cost += 3.5;
  }
  return cost;
}

function movementCost(
  note: number,
  previous: number | undefined,
  center: number,
  isBass = false,
  intentionalBassLeap = false,
): number {
  if (previous === undefined) return Math.abs(note - center) * 0.18;
  const distance = Math.abs(note - previous);
  const longBassLeap = isBass && !intentionalBassLeap && distance > 7 ? (distance - 7) * 0.75 : 0;
  return distance
    + (distance > 7 ? (distance - 7) * 1.4 : 0)
    + (distance > 12 ? 8 : 0)
    + longBassLeap
    - (distance === 0 ? 2.5 : 0);
}

function nearestChordPitch(model: ChordModel, target: number, minimum: number, maximum: number): number {
  const candidates: number[] = [];
  for (const pitchClass of model.chordPcs) {
    for (let pitch = minimum - 12; pitch <= maximum + 12; pitch++) if (mod(pitch, 12) === pitchClass) candidates.push(pitch);
  }
  const inRange = candidates.filter((pitch) => pitch >= minimum && pitch <= maximum);
  return (inRange.length ? inRange : candidates).sort((left, right) => Math.abs(left - target) - Math.abs(right - target))[0] ?? clampMidi(Math.round(target), minimum, maximum);
}

function voiceRange(index: number): { minimum: number; maximum: number } {
  const ranges = [
    { minimum: 30, maximum: 52 },
    { minimum: 40, maximum: 59 },
    { minimum: 48, maximum: 67 },
    { minimum: 56, maximum: 76 },
    { minimum: 64, maximum: 84 },
  ];
  return ranges[index] ?? ranges.at(-1)!;
}

function addChantTexture(events: CarillonEvent[], score: Score, melody: ScoreNote[], shift: number, secondsPerBeat: number, plan: ArrangementPlan, addBass: boolean): void {
  const totalBeats = scoreTotalBeats(melody);
  const ends = [...new Set((plan.cadences?.length ? plan.cadences : score.phrases ?? []).filter((beat) => beat > 0 && beat <= totalBeats))].sort((a, b) => a - b);
  if (!ends.length || ends.at(-1)! < totalBeats) ends.push(totalBeats);
  const tonicPc = chantTonicPc(melody, plan, shift);
  const register = chantRegister(melody, shift, tonicPc, score.mode);
  const tonicMidi = register.tonicMidi;
  const scale = scaleForMode(score.mode);
  const flowingTexture = plan.style === 'flowing';
  let phraseStart = 0;
  for (const [index, phraseEnd] of ends.entries()) {
    const phraseBeats = Math.max(1, phraseEnd - phraseStart);
    const phraseStartSeconds = phraseStart * secondsPerBeat;
    const phraseDuration = phraseBeats * secondsPerBeat;
    const pulse = plan.style === 'solemn' ? 0.3 : plan.style === 'contemplative' ? 0.23 : 0.28;
    if (addBass) {
      pushEvent(events, tonicMidi, phraseStartSeconds, Math.max(0.5, phraseDuration * 0.74), pulse * 0.8, 'chant-drone');
      if (phraseBeats > 5) pushEvent(events, register.lowTenor, (phraseStart + phraseBeats * 0.5) * secondsPerBeat, phraseDuration * 0.27, pulse * 0.5, 'chant-pedal-motion');
    }
    // Keep the historical voice name for callers, but this tone is the mode's
    // reciting tenor rather than an unconditional tonal fifth.
    pushEvent(events, register.lowTenor, phraseStartSeconds, Math.max(0.35, phraseDuration * 0.62), pulse * 0.52, 'chant-fifth');
    const cadenceStart = Math.max(phraseStart, phraseEnd - Math.min(1.5, phraseBeats * 0.3));
    const supportStarts = [...new Set([
      phraseStart,
      ...(phraseBeats >= 8 ? [phraseStart + phraseBeats * 0.5] : []),
      cadenceStart,
    ])].sort((left, right) => left - right);
    for (const [supportIndex, supportStart] of supportStarts.entries()) {
      const anchor = melody.find((note) => note.startBeat <= supportStart + 0.05 && note.startBeat + note.durationBeats > supportStart)
        ?? melody.find((note) => note.startBeat >= supportStart && note.startBeat < supportStart + 2);
      const anchorPitch = anchor ? pitchToMidi(anchor.pitch) + shift : register.cadenceTonic;
      const isCadence = supportStart >= cadenceStart - 0.01;
      const supportDuration = isCadence
        ? Math.min(1.6, phraseBeats * 0.3)
        : Math.min(2.4, Math.max(1.1, (phraseEnd - supportStart) * 0.7));
      const supportOffset = supportStart === phraseStart ? 0 : 0.16;
      const supportSeconds = (supportStart + supportOffset) * secondsPerBeat;
      if (flowingTexture) {
        // The flowing setting uses a small, phrase-aware modal progression:
        // tonic at the entrance, subdominant color in the middle, and a
        // dominant/tonic cadence. These are arrangement tones only; the
        // source chant events above remain the complete melody.
        const degree = isCadence ? (index === ends.length - 1 ? 0 : 4) : supportIndex === 0 ? 0 : 3;
        const chord = modalChord(tonicPc, scale, degree);
        pushEvent(events, nearestPitchClass(chord.rootPc, register.harmonyRootMinimum, register.harmonyRootMaximum), supportSeconds, supportDuration * 0.76 * secondsPerBeat, pulse * 0.42, 'chant-harmony-root');
        pushEvent(events, nearestPitchClass(chord.thirdPc, register.harmonyMinimum, register.harmonyMaximum), supportSeconds + 0.04 * secondsPerBeat, supportDuration * 0.82 * secondsPerBeat, pulse * 0.38, 'chant-harmony');
        pushEvent(events, nearestPitchClass(chord.fifthPc, register.innerMinimum, register.innerMaximum), supportSeconds + 0.08 * secondsPerBeat, supportDuration * 0.68 * secondsPerBeat, pulse * 0.3, 'chant-inner');

        // A high octave is a rare final-cadence color, not a response at every
        // phrase boundary. The chant itself remains the only complete melody.
        const isFinalAnchor = anchor && anchor.startBeat + anchor.durationBeats >= totalBeats - 0.05;
        if (isCadence && index === ends.length - 1 && isFinalAnchor) {
          const doubled = anchorPitch + 12;
          if (doubled <= Math.min(CARILLON_RANGE.highestMidi, register.melodyHighest + 12)) {
            pushEvent(events, doubled, Math.max(supportStart, anchor.startBeat - 0.04) * secondsPerBeat, Math.min(anchor.durationBeats, supportDuration + 0.1) * secondsPerBeat, pulse * 0.34, 'chant-octave');
          }
        }
      } else {
        const modalPitch = nearestScalePitch(anchorPitch - (isCadence ? 7 : 4), tonicPc, scale, register.harmonyMinimum, register.supportCeiling);
        pushEvent(events, modalPitch, supportSeconds, supportDuration * secondsPerBeat, pulse * 0.46, 'chant-inner');
      }
    }
    const cadencePitch = index === ends.length - 1 ? register.cadenceTonic : register.cadenceTenor;
    pushEvent(events, cadencePitch, cadenceStart * secondsPerBeat, Math.min(1.6, phraseBeats * 0.3) * secondsPerBeat, pulse * 0.58, index === ends.length - 1 ? 'chant-final' : 'chant-cadence');
    phraseStart = phraseEnd;
  }
}

/**
 * Gregorian free-rhythm scores use the final as their most reliable tonal
 * anchor. An explicit arrangement tonic is retained when it agrees with the
 * final, but a conflicting source-key tonic is not allowed to pull the chant
 * into a different harmonic center. The octave is resolved separately below.
 */
function chantTonicPc(melody: ScoreNote[], plan: ArrangementPlan, shift: number): number {
  const finalPc = mod(pitchToMidi(melody.at(-1)!.pitch) + shift, 12);
  const plannedPc = plan.tonic ? mod(pitchToMidi(plan.tonic) + shift, 12) : finalPc;
  return plannedPc === finalPc ? plannedPc : finalPc;
}

/** Mode-specific reciting tones, measured above the final. */
function chantTenorPc(tonicPc: number, mode: number | undefined): number {
  const tenorIntervals: Record<number, number> = {
    1: 7,
    2: 3,
    3: 8,
    4: 5,
    5: 7,
    6: 4,
    7: 7,
    8: 5,
  };
  return mod(tonicPc + (tenorIntervals[mode ?? 0] ?? 7), 12);
}

function chantRegister(melody: ScoreNote[], shift: number, tonicPc: number, mode: number | undefined): ChantRegister {
  const melodyLowest = Math.min(...melody.map((note) => pitchToMidi(note.pitch) + shift));
  const melodyHighest = Math.max(...melody.map((note) => pitchToMidi(note.pitch) + shift));

  // Put the final about two octaves below the lowest transposed chant note.
  // The window is intentionally relative to the chant, while the carillon
  // range remains the final safety boundary for very low or very high imports.
  const foundationTarget = clampMidi(melodyLowest - 24, CARILLON_RANGE.lowestMidi, CARILLON_RANGE.highestMidi);
  const foundationMinimum = clampMidi(foundationTarget - 7, CARILLON_RANGE.lowestMidi, CARILLON_RANGE.highestMidi);
  const foundationMaximum = clampMidi(foundationTarget + 7, foundationMinimum, CARILLON_RANGE.highestMidi);
  const tonicMidi = nearestPitchClass(tonicPc, foundationMinimum, foundationMaximum);
  const tenorPc = chantTenorPc(tonicPc, mode);
  const lowTenor = nearestPitchClass(tenorPc, tonicMidi + 5, tonicMidi + 17);

  // The highest routine support tone stays below or just above the chant's
  // lowest note. This replaces the old absolute 60–86 targets.
  const supportCeiling = clampMidi(
    Math.min(melodyLowest + 8, Math.max(tonicMidi + 29, melodyLowest + 4)),
    CARILLON_RANGE.lowestMidi,
    CARILLON_RANGE.highestMidi,
  );
  const boundedRange = (minimum: number, maximum: number): [number, number] => {
    const upper = clampMidi(maximum, CARILLON_RANGE.lowestMidi, CARILLON_RANGE.highestMidi);
    const lower = clampMidi(Math.min(minimum, upper), CARILLON_RANGE.lowestMidi, upper);
    return [lower, upper];
  };
  const [harmonyRootMinimum, harmonyRootMaximum] = boundedRange(tonicMidi + 5, Math.min(tonicMidi + 17, supportCeiling - 10));
  const [harmonyMinimum, harmonyMaximum] = boundedRange(tonicMidi + 12, Math.min(tonicMidi + 25, supportCeiling - 5));
  const [innerMinimum, innerMaximum] = boundedRange(tonicMidi + 20, supportCeiling);
  const [cadenceMinimum, cadenceMaximum] = boundedRange(
    Math.max(tonicMidi + 12, melodyLowest - 12),
    Math.min(supportCeiling, melodyLowest + 4),
  );

  return {
    melodyLowest,
    melodyHighest,
    tonicMidi,
    tenorPc,
    lowTenor,
    supportCeiling,
    harmonyRootMinimum,
    harmonyRootMaximum,
    harmonyMinimum,
    harmonyMaximum,
    innerMinimum,
    innerMaximum,
    cadenceMinimum,
    cadenceMaximum,
    cadenceTonic: nearestPitchClass(tonicPc, cadenceMinimum, cadenceMaximum),
    cadenceTenor: nearestPitchClass(tenorPc, cadenceMinimum, cadenceMaximum),
  };
}

function modalChord(tonicPc: number, scale: number[], degree: number): { rootPc: number; thirdPc: number; fifthPc: number } {
  const rootIndex = mod(degree, scale.length);
  return {
    rootPc: mod(tonicPc + scale[rootIndex], 12),
    thirdPc: mod(tonicPc + scale[(rootIndex + 2) % scale.length], 12),
    fifthPc: mod(tonicPc + scale[(rootIndex + 4) % scale.length], 12),
  };
}

function addBassLine(events: CarillonEvent[], melody: ScoreNote[], score: Score, shift: number, secondsPerBeat: number): void {
  const beatGroup = score.rhythmicCharacter === 'free' ? 8 : Math.max(1, score.meter.numerator * (4 / score.meter.denominator));
  const used = new Set<number>();
  const chant = score.rhythmicCharacter === 'free';
  const register = chant ? chantRegister(melody, shift, chantTonicPc(melody, score.arrangement ?? defaultPlan(score), shift), score.mode) : undefined;
  for (const source of melody) {
    const beat = Math.round(source.startBeat * 1000) / 1000;
    if (beat % beatGroup !== 0 || used.has(beat)) continue;
    used.add(beat);
    const bass = chant && register
      ? nearestPitchClass(used.size % 2 === 1 ? mod(register.tonicMidi, 12) : register.tenorPc, register.tonicMidi - 7, register.tonicMidi + 7)
      : clampMidi(pitchToMidi(source.pitch) + shift - 24, 36, 55);
    pushEvent(events, bass, source.startBeat * secondsPerBeat, Math.max(2, beatGroup) * secondsPerBeat, Math.max(0.2, source.velocity * 0.34), 'bass');
  }
}

function defaultPlan(score: Score): ArrangementPlan {
  if (score.rhythmicCharacter === 'free') return { style: 'contemplative', cadences: score.phrases };
  const style: ArrangementStyle = score.meter.numerator === 3 ? 'flowing' : score.mode && [1, 2, 5, 6].includes(score.mode) ? 'solemn' : 'grand';
  return { style, cadences: score.phrases };
}

function styleProfile(style: ArrangementStyle): StyleProfile {
  switch (style) {
    case 'contemplative':
      return { bassGain: 0.62, harmonyGain: 0.38, innerGain: 0.34, upperGain: 0.2, bassSustain: 0.86, harmonySustain: 0.78, motionBeats: 2.4, noteLength: 0.72, staggerBeats: 0.14, passing: true, octaveAtCadence: false, flourish: false, figure: false };
    case 'solemn':
      return { bassGain: 0.72, harmonyGain: 0.48, innerGain: 0.42, upperGain: 0.25, bassSustain: 0.74, harmonySustain: 0.68, motionBeats: 1.7, noteLength: 0.7, staggerBeats: 0.12, passing: true, octaveAtCadence: true, flourish: false, figure: false };
    case 'celebratory':
      return { bassGain: 0.78, harmonyGain: 0.5, innerGain: 0.54, upperGain: 0.42, bassSustain: 0.56, harmonySustain: 0.58, motionBeats: 0.72, noteLength: 0.58, staggerBeats: 0.1, passing: true, octaveAtCadence: true, flourish: true, figure: true };
    case 'flowing':
      return { bassGain: 0.65, harmonyGain: 0.42, innerGain: 0.48, upperGain: 0.31, bassSustain: 0.6, harmonySustain: 0.6, motionBeats: 0.78, noteLength: 0.62, staggerBeats: 0.11, passing: true, octaveAtCadence: true, flourish: true, figure: true };
    case 'chorale':
      return { bassGain: 0.68, harmonyGain: 0.46, innerGain: 0.4, upperGain: 0.24, bassSustain: 0.78, harmonySustain: 0.72, motionBeats: 1.8, noteLength: 0.74, staggerBeats: 0.12, passing: true, octaveAtCadence: true, flourish: false, figure: false };
    case 'grand':
    default:
      return { bassGain: 0.75, harmonyGain: 0.48, innerGain: 0.48, upperGain: 0.34, bassSustain: 0.64, harmonySustain: 0.64, motionBeats: 1.55, noteLength: 0.64, staggerBeats: 0.1, passing: true, octaveAtCadence: true, flourish: true, figure: true };
  }
}

function chordVelocity(score: Score, beat: number, style: ArrangementStyle): number {
  const barBeats = score.meter.numerator * (4 / score.meter.denominator);
  const beatInBar = mod(beat, Math.max(1, barBeats));
  const accent = beatInBar < 0.05 ? 1 : beatInBar < 1.05 ? 0.9 : 0.78;
  const styleGain = style === 'celebratory' ? 0.94 : style === 'contemplative' ? 0.7 : style === 'solemn' ? 0.8 : 0.86;
  return accent * styleGain;
}

function functionForChange(change: ChordChange): HarmonicFunction {
  if (change.degree === 1 || change.romanNumeral === 'I') return 'tonic';
  if (change.degree === 5 || change.quality === 'dominant' || change.romanNumeral?.includes('V')) return 'dominant';
  if (change.degree === 2 || change.degree === 4) return 'predominant';
  return 'modal';
}

function chordIntervals(quality: ChordChange['quality']): number[] {
  switch (quality) {
    case 'minor': return [0, 3, 7];
    case 'dominant': return [0, 4, 7, 10];
    case 'sus4': return [0, 5, 7];
    case 'diminished': return [0, 3, 6];
    case 'major': return [0, 4, 7];
  }
}

function scaleForMode(mode: number | undefined): number[] {
  return [...(mode === undefined ? MAJOR_SCALE : MODE_SCALES[mode] ?? MAJOR_SCALE)];
}

function rootPitchForPc(pitchClass: number, tonicMidi: number): number {
  const center = clampMidi(tonicMidi, 48, 60);
  let pitch = center + mod(pitchClass - center, 12);
  if (pitch > center + 6) pitch -= 12;
  return clampMidi(pitch, 36, 72);
}

function romanNumeral(degree: number, diminished: boolean): string {
  return `${['', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'][degree] ?? 'I'}${diminished ? '°' : ''}`;
}

function finalChordEndpoint(changes: ChordChange[], phraseEnd: number, tonicPc: number): number {
  const change = changes.find((candidate) => Math.abs(candidate.startBeat + candidate.durationBeats - phraseEnd) < 0.08);
  return change?.degree === 5 ? 7 : mod(pitchToMidi(change?.root ?? midiToPitch(tonicPc + 60)) - tonicPc, 12);
}

function melodyAnchorAt(melody: ScoreNote[], startBeat: number, endBeat: number, shift: number): number {
  const local = melody.filter((note) => note.startBeat < endBeat && note.startBeat + note.durationBeats > startBeat);
  return local.length ? Math.max(...local.map((note) => pitchToMidi(note.pitch) + shift)) : Math.max(...melody.map((note) => pitchToMidi(note.pitch) + shift));
}

function stepScalePitch(target: number, from: number, tonicPc: number, scale: number[]): number {
  const direction = target >= from ? 1 : -1;
  const candidates: number[] = [];
  for (let pitch = Math.max(24, from - 14); pitch <= Math.min(100, from + 14); pitch++) {
    if (scale.includes(mod(pitch - tonicPc, 12))) candidates.push(pitch);
  }
  const sorted = candidates.sort((left, right) => Math.abs(left - from) - Math.abs(right - from));
  const nearest = sorted.find((pitch) => direction > 0 ? pitch > from : pitch < from);
  return nearest ?? from;
}

function nearestScalePitch(target: number, tonicPc: number, scale: number[], minimum: number, maximum: number): number {
  const candidates: number[] = [];
  for (let pitch = minimum; pitch <= maximum; pitch++) if (scale.includes(mod(pitch - tonicPc, 12))) candidates.push(pitch);
  return candidates.sort((left, right) => Math.abs(left - target) - Math.abs(right - target))[0] ?? clampMidi(Math.round(target), minimum, maximum);
}

function analyzeMelodyActivity(melody: ScoreNote[], startBeat: number, endBeat: number): MelodyActivity {
  const orderedMelody = [...melody].sort((left, right) => left.startBeat - right.startBeat);
  const notes = orderedMelody
    .filter((note) => note.startBeat < endBeat && note.startBeat + note.durationBeats > startBeat)
    .sort((left, right) => left.startBeat - right.startBeat);
  let pitchMotion = 0;
  for (let index = 1; index < notes.length; index++) pitchMotion += Math.min(12, Math.abs(pitchToMidi(notes[index].pitch) - pitchToMidi(notes[index - 1].pitch)));
  const onsetCount = notes.filter((note) => note.startBeat >= startBeat - 0.05 && note.startBeat < endBeat - 0.05).length;
  const onsetActivity = clamp((onsetCount - 1) / 4, 0, 1);
  const motionActivity = clamp(pitchMotion / 14, 0, 1);
  const activity = clamp(onsetActivity * 0.45 + motionActivity * 0.55, 0, 1);
  const hasLongNote = notes.some((note) => note.durationBeats >= 2.5);
  const hasGap = orderedMelody.some((note, index) => {
    const next = orderedMelody[index + 1];
    if (!next) return false;
    const gap = next.startBeat - (note.startBeat + note.durationBeats);
    const midpoint = note.startBeat + note.durationBeats + gap * 0.5;
    return gap >= 0.5 && midpoint >= startBeat && midpoint < endBeat;
  });
  const complex = onsetCount >= 3 && pitchMotion >= 7;
  return { onsetCount, pitchMotion, activity, simple: onsetCount <= 2 || activity < 0.3, complex, hasLongNote, hasGap };
}

function scoreTotalBeats(melody: ScoreNote[]): number {
  return Math.max(...melody.map((event) => event.startBeat + event.durationBeats));
}

function roundBeat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function pushEvent(events: CarillonEvent[], midi: number, startSeconds: number, durationSeconds: number, velocity: number, voice: string): void {
  const pitch = midiToPitch(clampMidi(Math.round(midi), CARILLON_RANGE.lowestMidi, CARILLON_RANGE.highestMidi));
  bellForPitch(pitch);
  events.push({ pitch, startSeconds: Math.max(0, startSeconds), durationSeconds: Math.max(0.1, durationSeconds), velocity: clamp(velocity, 0.08, 0.85), voice });
}

function chooseWholePieceTranspose(events: ScoreNote[], targetLow: number, targetHigh: number): number {
  const min = Math.min(...events.map((event) => pitchToMidi(event.pitch)));
  const max = Math.max(...events.map((event) => pitchToMidi(event.pitch)));
  const center = (min + max) / 2;
  let shift = Math.round((targetLow + targetHigh) / 2 - center);
  if (min + shift < CARILLON_RANGE.lowestMidi) shift += CARILLON_RANGE.lowestMidi - (min + shift);
  if (max + shift > CARILLON_RANGE.highestMidi) shift -= (max + shift) - CARILLON_RANGE.highestMidi;
  return shift;
}

function diagnose(events: CarillonEvent[], transposeSemitones: number): ArrangementDiagnostics {
  const allMidi = events.map((event) => pitchToMidi(event.pitch));
  const melody = events.filter((event) => event.voice === 'melody' || event.voice === 'chant');
  const melodyMidi = (melody.length ? melody : events).map((event) => pitchToMidi(event.pitch));
  const lowCount = allMidi.filter((midi) => midi < 48).length;
  const warnings: string[] = [];
  if (lowCount / allMidi.length > 0.6) warnings.push('More than 60% of events are below C3; arrangement may sound muddy or unusually low.');
  if (Math.min(...melodyMidi) < 55) warnings.push('Melody is below G3; verify register before publishing.');
  let overlappingEvents = 0;
  const byStart = new Map<number, number>();
  for (const event of events) byStart.set(Math.round(event.startSeconds * 1000), (byStart.get(Math.round(event.startSeconds * 1000)) ?? 0) + 1);
  for (const count of byStart.values()) if (count > 1) overlappingEvents += count;
  return {
    lowestNote: midiToPitch(Math.min(...allMidi)),
    highestNote: midiToPitch(Math.max(...allMidi)),
    melodyLowest: midiToPitch(Math.min(...melodyMidi)),
    melodyHighest: midiToPitch(Math.max(...melodyMidi)),
    overallRangeSemitones: Math.max(...allMidi) - Math.min(...allMidi),
    voices: [...new Set(events.map((event) => event.voice))],
    overlappingEvents,
    transposeSemitones,
    warnings,
  };
}

function nearestPitchClass(pitchClass: number, minimum: number, maximum: number): number {
  const candidates: number[] = [];
  for (let pitch = minimum; pitch <= maximum; pitch++) {
    if (mod(pitch, 12) === mod(pitchClass, 12)) candidates.push(pitch);
  }
  const target = (minimum + maximum) / 2;
  return candidates.sort((left, right) => Math.abs(left - target) - Math.abs(right - target) || left - right)[0]
    ?? clampMidi(Math.round(target), minimum, maximum);
}

function clampMidi(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function mod(value: number, divisor: number): number { return ((value % divisor) + divisor) % divisor; }
