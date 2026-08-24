import { describe, expect, it } from 'vitest';
import { analyzeAudio } from '../src/audio/analysis.js';
import { AudioEngine } from '../src/audio/engine.js';
import { CARILLON_BELLS, CARILLON_RANGE } from '../src/bells/instrument.js';
import { synthesizeBell } from '../src/bells/synth.js';
import { BUILTIN_ASSETS } from '../src/library/library.js';
import { BUILTIN_HYMNS } from '../src/library/hymns.js';
import { arrangeForCarillon, inferChordPlan } from '../src/melodies/arranger.js';
import { pitchToMidi, scoreFromMelody, Score } from '../src/melodies/types.js';
import { mkdtemp, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('large carillon audio layer', () => {
  it('contains individually identified bells across a grand-carillon range', () => {
    expect(CARILLON_BELLS).toHaveLength(77);
    expect(CARILLON_RANGE.lowest).toBe('C1');
    expect(CARILLON_RANGE.highest).toBe('E7');
    expect(new Set(CARILLON_BELLS.map((bell) => bell.id)).size).toBe(77);
    expect(
      new Set(CARILLON_BELLS.map((bell) => bell.partials.map((partial) => partial.ratio).join(',')))
        .size,
    ).toBeGreaterThan(60);
    expect(CARILLON_BELLS[0].tailSeconds).toBeGreaterThan(CARILLON_BELLS.at(-1)!.tailSeconds * 4);
  });

  it('keeps a large bell tail and applies far-field high-frequency attenuation', () => {
    const samples = synthesizeBell({
      pitch: 'C1',
      sampleRate: 8000,
      duration: 18,
      distance: 'half-mile',
    });
    const metrics = analyzeAudio(samples, 8000);
    expect(metrics.peak).toBeLessThan(1);
    expect(metrics.clippedSamples).toBe(0);
    expect(Math.abs(metrics.dcOffsetLeft)).toBeLessThan(0.01);
    expect(Math.abs(metrics.dcOffsetRight)).toBeLessThan(0.01);
    expect(metrics.tailRms).toBeGreaterThan(0.00001);
    expect(metrics.tailToBodyRatio).toBeLessThan(1);
  });

  it('renders an event tail even when performance duration is short', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'carillon-tail-'));
    const engine = new AudioEngine(directory, 8000);
    const file = await engine.renderSequence(
      'tail',
      [{ pitch: 'C1', start: 0, duration: 0.1, voice: 'bass' }],
      0.1,
    );
    const bytes = await stat(file);
    const durationSeconds = (bytes.size - 44) / (2 * 2 * 8000);
    expect(durationSeconds).toBeGreaterThan(10);
  });

  it('produces overlapping melody, harmony, and bass voices in a sensible register', () => {
    const score: Score = {
      id: 'chord-test',
      name: 'Chord test',
      tempoBpm: 72,
      meter: { numerator: 4, denominator: 4 },
      ppq: 480,
      events: [
        { pitch: 'C4', startBeat: 0, durationBeats: 2, velocity: 0.9, voice: 'melody' },
        { pitch: 'E4', startBeat: 2, durationBeats: 2, velocity: 0.9, voice: 'melody' },
      ],
      rhythmicCharacter: 'metered',
    };
    const arrangement = arrangeForCarillon(score);
    expect(arrangement.diagnostics.voices).toEqual(
      expect.arrayContaining(['melody', 'harmony', 'bass']),
    );
    expect(arrangement.diagnostics.overlappingEvents).toBeGreaterThan(1);
    expect(arrangement.diagnostics.melodyLowest).not.toMatch(/^C[012]/);
    expect(arrangement.diagnostics.warnings).not.toContain(
      'Melody is below G3; verify register before publishing.',
    );
  });

  it('plans phrase cadences from functional harmony rather than repeating one chord per bar', () => {
    const score: Score = {
      id: 'cadence-test',
      name: 'Cadence test',
      tempoBpm: 72,
      meter: { numerator: 4, denominator: 4 },
      ppq: 480,
      phrases: [8, 16],
      events: ['C4', 'E4', 'G4', 'E4', 'F4', 'D4', 'G4', 'E4', 'A4', 'F4', 'D4', 'G4', 'C5'].map(
        (pitch, index) => ({
          pitch,
          startBeat: index === 12 ? 15 : index * 1.25,
          durationBeats: index === 12 ? 1 : 1.25,
          velocity: 0.8,
          voice: 'melody',
        }),
      ),
      rhythmicCharacter: 'metered',
    };
    const chords = inferChordPlan(score.events, score, 'C4');
    expect(chords.length).toBeGreaterThan(4);
    expect(chords.slice(-3).map((chord) => chord.degree)).toEqual([2, 5, 1]);
    expect(chords.some((chord) => chord.quality === 'dominant')).toBe(true);
  });

  it('gives a grand setting independently moving voices and a real final flourish', () => {
    const score: Score = {
      id: 'voice-test',
      name: 'Voice test',
      tempoBpm: 72,
      meter: { numerator: 4, denominator: 4 },
      ppq: 480,
      phrases: [8, 16],
      events: Array.from({ length: 16 }, (_, index) => ({
        pitch: [
          'C4',
          'D4',
          'E4',
          'G4',
          'F4',
          'E4',
          'D4',
          'C4',
          'A4',
          'G4',
          'F4',
          'E4',
          'D4',
          'G4',
          'B4',
          'C5',
        ][index],
        startBeat: index,
        durationBeats: 1,
        velocity: 0.82,
        voice: 'melody',
      })),
      rhythmicCharacter: 'metered',
      arrangement: { style: 'grand', tonic: 'C4', cadences: [8, 16] },
    };
    const arrangement = arrangeForCarillon(score);
    expect(arrangement.diagnostics.voices).toEqual(
      expect.arrayContaining([
        'bass',
        'harmony',
        'inner-harmony-1',
        'inner-harmony-2',
        'upper-harmony',
      ]),
    );
    expect(arrangement.diagnostics.voices).toEqual(
      expect.arrayContaining(['cadential-flourish', 'cadence-octave']),
    );
    expect(arrangement.events.some((event) => event.durationSeconds < 1.2)).toBe(true);
    expect(
      new Set(
        arrangement.events
          .filter((event) => event.voice === 'inner-harmony-1')
          .map((event) => event.pitch),
      ).size,
    ).toBeGreaterThan(1);
    expect(arrangement.diagnostics.overallRangeSemitones).toBeGreaterThan(30);
  });

  it('makes celebratory and contemplative settings materially different', () => {
    const score: Score = {
      id: 'style-test',
      name: 'Style test',
      tempoBpm: 80,
      meter: { numerator: 4, denominator: 4 },
      ppq: 480,
      events: Array.from({ length: 12 }, (_, index) => ({
        pitch: ['C4', 'E4', 'G4', 'A4'][index % 4],
        startBeat: index,
        durationBeats: 1,
        velocity: 0.8,
        voice: 'melody',
      })),
      rhythmicCharacter: 'metered',
    };
    const contemplative = arrangeForCarillon(score, {
      arrangement: { style: 'contemplative', tonic: 'C4' },
    });
    const celebratory = arrangeForCarillon(score, {
      arrangement: { style: 'celebratory', tonic: 'C4' },
    });
    expect(celebratory.events.length).toBeGreaterThan(contemplative.events.length);
    expect(celebratory.diagnostics.voices).toEqual(expect.arrayContaining(['alternating-figure']));
    expect(contemplative.diagnostics.voices).not.toContain('alternating-figure');
  });

  it('keeps a simple hymn passage chordal without filling every subdivision', () => {
    const score: Score = {
      id: 'restraint-test',
      name: 'Restraint test',
      tempoBpm: 72,
      meter: { numerator: 4, denominator: 4 },
      ppq: 480,
      events: Array.from({ length: 16 }, (_, index) => ({
        pitch: index < 8 ? 'C4' : 'E4',
        startBeat: index,
        durationBeats: 1,
        velocity: 0.8,
        voice: 'melody',
      })),
      rhythmicCharacter: 'metered',
      arrangement: { style: 'grand', tonic: 'C4' },
    };
    const arrangement = arrangeForCarillon(score);
    const early = arrangement.events.filter(
      (event) => event.startSeconds < 8 * (60 / score.tempoBpm),
    );
    expect(early.map((event) => event.voice)).toEqual(
      expect.arrayContaining(['melody', 'bass', 'harmony', 'inner-harmony-1']),
    );
    expect(early.some((event) => ['inner-harmony-2', 'upper-harmony'].includes(event.voice))).toBe(
      false,
    );
    expect(
      early.some((event) =>
        ['alternating-figure', 'passing-tone', 'alternating-response'].includes(event.voice),
      ),
    ).toBe(false);
    expect(
      arrangement.events.filter((event) =>
        ['alternating-figure', 'passing-tone', 'alternating-response'].includes(event.voice),
      ).length,
    ).toBeLessThanOrEqual(4);
  });

  it('keeps metered hymn basses context-aware without removing deep bells', () => {
    const affectedIds = [
      'o-sacred-head-now-wounded',
      'amazing-grace',
      'come-thou-fount',
      'hark-the-herald-angels-sing',
      'while-shepherds-watched',
    ];

    for (const id of affectedIds) {
      const hymn = BUILTIN_HYMNS.find((asset) => asset.id === id)!;
      const arrangement = arrangeForCarillon(scoreFromMelody(hymn.melody));
      const bass = arrangement.events
        .filter((event) => event.voice === 'bass')
        .sort((left, right) => left.startSeconds - right.startSeconds)
        .map((event) => pitchToMidi(event.pitch));

      expect(Math.min(...bass), id).toBeLessThan(48);
      expect(isolatedBassDips(bass), id).toEqual([]);
    }

    const goodHymn = BUILTIN_HYMNS.find((asset) => asset.id === 'hymn-to-joy')!;
    const goodBass = arrangeForCarillon(scoreFromMelody(goodHymn.melody)).events
      .filter((event) => event.voice === 'bass')
      .sort((left, right) => left.startSeconds - right.startSeconds)
      .map((event) => event.pitch);
    expect(goodBass).toEqual(['C#2', 'D2', 'C#2', 'B1', 'C#2', 'B1', 'B1', 'B1']);
    expect(goodBass).toContain('B1');
  });

  it('keeps canonical chant assets source-backed and phrase-aware', () => {
    for (const id of [
      'salve-regina',
      'veni-creator-spiritus',
      'ave-maris-stella',
      'ave-regina-caelorum',
    ]) {
      const hymn = BUILTIN_HYMNS.find((asset) => asset.id === id)!;
      expect(hymn.melody.notationFormat).toBe('abc');
      expect(hymn.melody.notes.length).toBeGreaterThan(30);
      expect(hymn.melody.score?.rhythmicCharacter).toBe('free');
      expect(hymn.sourceUrl).toMatch(/^https?:\/\//);
    }
    const salveRegina = BUILTIN_HYMNS.find((asset) => asset.id === 'salve-regina')!;
    expect(salveRegina.name).toBe('Salve Regina (Tonus Simplex)');
    expect(salveRegina.melody.mode).toBe(5);
    expect(salveRegina.melody.notation).toContain('X:salve-regina');
    expect(salveRegina.melody.notation).toContain('M:1/1');
    expect(salveRegina.melody.source).toContain('Liber Usualis, Solesmes 1961, p. 279');
    expect(salveRegina.melody.arrangement).toMatchObject({ style: 'flowing', tonic: 'G3' });

    const marianPrimaryIds = [
      'salve-regina',
      'regina-caeli',
      'alma-redemptoris-mater',
      'ave-regina-caelorum',
    ];
    for (const id of marianPrimaryIds) {
      const hymn = BUILTIN_HYMNS.find((asset) => asset.id === id)!;
      const arrangement = arrangeForCarillon(hymn.melody.score!);
      expect(arrangement.events.length).toBeGreaterThan(hymn.melody.notes.length);
      expect(arrangement.diagnostics.voices).toEqual(
        expect.arrayContaining([
          'chant',
          'chant-drone',
          'chant-harmony-root',
          'chant-harmony',
          'chant-inner',
          'chant-octave',
        ]),
      );
      expect(arrangement.diagnostics.warnings).toEqual([]);
    }

    for (const id of [
      'salve-regina-solemn',
      'regina-caeli-solemn',
      'alma-redemptoris-mater-solemn',
      'ave-regina-caelorum-solemn',
    ]) {
      expect(BUILTIN_HYMNS.find((asset) => asset.id === id)).toBeTruthy();
    }
    const reginaSimple = BUILTIN_HYMNS.find((asset) => asset.id === 'regina-caeli')!;
    expect(reginaSimple.melody.notes.slice(0, 4).map((note) => note.pitch)).toEqual([
      'F4',
      'G4',
      'F5',
      'G4',
    ]);
    const quarter = BUILTIN_ASSETS.find((asset) => asset.id === 'westminster-quarter')!;
    expect(quarter.events?.map((event) => event.pitch)).toEqual(['G#4', 'F#4', 'E4', 'B3']);
    expect(quarter.events?.map((event) => event.offset)).toEqual([
      0,
      0.62,
      1.24,
      expect.closeTo(1.86, 6),
    ]);
  });

  it('keeps Gregorian support below the transposed chant across registers and modes', () => {
    const cases = [
      {
        id: 'low-dorian',
        mode: 1,
        pitches: ['C3', 'D3', 'F3', 'E3', 'D3'],
        arrangement: { style: 'contemplative' as const, tonic: 'C3' },
      },
      {
        id: 'mid-phrygian',
        mode: 2,
        pitches: ['E4', 'F4', 'G4', 'F4', 'E4'],
        arrangement: { style: 'solemn' as const },
      },
      {
        id: 'high-mixolydian',
        mode: 8,
        pitches: ['G5', 'A5', 'C6', 'B5', 'G5'],
        arrangement: { style: 'flowing' as const, tonic: 'G5' },
      },
    ];

    for (const testCase of cases) {
      const sourceMidi = testCase.pitches.map(pitchToMidi);
      const score: Score = {
        id: testCase.id,
        name: testCase.id,
        tempoBpm: 60,
        meter: { numerator: 1, denominator: 1 },
        ppq: 480,
        mode: testCase.mode,
        rhythmicCharacter: 'free',
        phrases: [10],
        arrangement: testCase.arrangement,
        events: testCase.pitches.map((pitch, index) => ({
          pitch,
          startBeat: index * 2,
          durationBeats: 2,
          velocity: 0.84,
          voice: 'chant',
        })),
      };
      const arrangement = arrangeForCarillon(score, {
        melodyTargetLow: Math.min(...sourceMidi),
        melodyTargetHigh: Math.max(...sourceMidi),
      });
      const melody = arrangement.events.filter((event) => event.voice === 'chant');
      const accompaniment = arrangement.events.filter((event) => event.voice.startsWith('chant-'));
      const regularSupport = accompaniment.filter((event) => event.voice !== 'chant-octave');
      const melodyMidi = melody.map((event) => pitchToMidi(event.pitch));
      const supportMidi = regularSupport.map((event) => pitchToMidi(event.pitch));
      const finalPc = melodyMidi.at(-1)! % 12;

      expect(melody.map((event) => pitchToMidi(event.pitch))).toEqual(sourceMidi);
      expect(Math.max(...supportMidi)).toBeLessThanOrEqual(Math.min(...melodyMidi) + 8);
      expect(Math.min(...supportMidi)).toBeLessThan(Math.min(...melodyMidi) - 12);
      expect(pitchToMidi(arrangement.events.find((event) => event.voice === 'chant-drone')!.pitch) % 12).toBe(finalPc);
      expect(pitchToMidi(arrangement.events.find((event) => event.voice === 'chant-final')!.pitch) % 12).toBe(finalPc);
      expect(accompaniment.filter((event) => event.voice === 'chant-octave').length).toBeLessThanOrEqual(1);
      expect(regularSupport.length).toBeLessThan(14);
    }
  });

  it('gives the hymn catalog distinct source-backed, genuinely polyphonic settings', () => {
    expect(BUILTIN_HYMNS.length).toBeGreaterThanOrEqual(35);
    const styles = new Set(BUILTIN_HYMNS.map((hymn) => hymn.melody.arrangement?.style));
    expect(styles.size).toBeGreaterThanOrEqual(5);
    for (const hymn of BUILTIN_HYMNS) {
      expect(hymn.sourceUrl).toMatch(/^https?:\/\//);
      expect(hymn.melody.notation).toBeTruthy();
      const arrangement = arrangeForCarillon(
        hymn.melody.score ?? {
          id: hymn.melody.id,
          name: hymn.melody.name,
          tempoBpm: hymn.melody.bpm,
          meter: hymn.melody.meter ?? { numerator: 4, denominator: 4 },
          ppq: 480,
          rhythmicCharacter: hymn.melody.rhythmicCharacter,
          events: hymn.melody.notes.map((note, index) => ({
            pitch: note.pitch,
            startBeat: note.beat ?? index,
            durationBeats: note.duration,
            velocity: note.velocity ?? 0.78,
            voice: note.voice ?? 'melody',
          })),
          arrangement: hymn.melody.arrangement,
        },
      );
      expect(arrangement.events.length).toBeGreaterThan(hymn.melody.notes.length);
      expect(
        arrangement.diagnostics.voices.some((voice) => voice === 'bass' || voice === 'chant-drone'),
      ).toBe(true);
      expect(
        arrangement.diagnostics.voices.some((voice) => voice === 'melody' || voice === 'chant'),
      ).toBe(true);
      const starts = new Map<string, number>();
      for (const event of arrangement.events)
        starts.set(
          event.startSeconds.toFixed(3),
          (starts.get(event.startSeconds.toFixed(3)) ?? 0) + 1,
        );
      expect(Math.max(...starts.values())).toBeGreaterThanOrEqual(4);
    }
  });

  it('keeps full-form source imports substantially longer than a one-phrase sketch', () => {
    for (const id of [
      'come-thou-fount',
      'o-come-all-ye-faithful',
      'once-in-royal-davids-city',
      'in-the-bleak-midwinter',
    ]) {
      const hymn = BUILTIN_HYMNS.find((asset) => asset.id === id)!;
      expect(hymn.melody.notes.length).toBeGreaterThan(50);
      expect(
        [...hymn.melody.notes].reverse().find((note) => note.pitch !== 'rest')?.pitch,
      ).toBeTruthy();
    }
    const comeThouFount = BUILTIN_HYMNS.find((asset) => asset.id === 'come-thou-fount')!;
    expect(
      [...comeThouFount.melody.notes].reverse().find((note) => note.pitch !== 'rest')?.pitch,
    ).toBe('D4');
  });

  it('offers multiple source-backed hymn choices in every liturgical season', () => {
    const counts = new Map<string, number>();
    for (const hymn of BUILTIN_HYMNS)
      for (const season of hymn.melody.liturgicalSeasons ?? [])
        counts.set(season, (counts.get(season) ?? 0) + 1);
    for (const season of [
      'Advent',
      'Christmas',
      'Epiphany',
      'Lent',
      'Holy Week',
      'Easter',
      'Ascension',
      'Pentecost',
      'Ordinary Time',
    ]) {
      expect(counts.get(season) ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});

function isolatedBassDips(bass: number[]): Array<{ index: number; dip: number }> {
  const dips: Array<{ index: number; dip: number }> = [];
  for (let index = 1; index < bass.length - 1; index++) {
    const dip = Math.min(bass[index - 1], bass[index + 1]) - bass[index];
    if (dip >= 4) dips.push({ index, dip });
  }
  return dips;
}
