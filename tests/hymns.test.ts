import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { BUILTIN_HYMNS } from '../src/library/hymns.js';

interface BaselineHymn {
  id: string;
  name: string;
  source?: string;
  sourceUrl: string;
  license: string;
  tags: string[];
  seasons?: string[];
  offices?: string[];
  arrangement?: unknown;
  meter?: unknown;
  scoreMeter?: unknown;
  mode?: number | null;
  rhythmicCharacter?: string;
  phrases?: number[];
  events: Array<{ pitch: string; duration: number; tie?: string }>;
}

const baseline = JSON.parse(
  fs.readFileSync(new URL('./fixtures/hymn-baseline.json', import.meta.url), 'utf8'),
) as BaselineHymn[];

describe('structured hymn migration', () => {
  it('keeps every pre-refactor metadata field and normalized event stream', () => {
    expect(BUILTIN_HYMNS).toHaveLength(baseline.length);
    expect(new Set(BUILTIN_HYMNS.map((hymn) => hymn.id)).size).toBe(BUILTIN_HYMNS.length);

    for (const expected of baseline) {
      const hymn = BUILTIN_HYMNS.find((asset) => asset.id === expected.id);
      expect(hymn, expected.id).toBeTruthy();
      expect(hymn?.name).toBe(expected.name);
      expect(hymn?.melody.source).toBe(expected.source);
      expect(hymn?.sourceUrl).toBe(expected.sourceUrl);
      expect(hymn?.license).toBe(expected.license);
      expect(hymn?.tags).toEqual(expected.tags);
      expect(hymn?.melody.liturgicalSeasons).toEqual(expected.seasons);
      expect(hymn?.melody.officeUsage).toEqual(expected.offices);
      expect(hymn?.melody.arrangement).toEqual(expected.arrangement);
      expect(hymn?.notation.meter).toEqual(expected.meter ?? expected.scoreMeter);
      expect(hymn?.notation.mode).toBe(Number.isFinite(expected.mode) ? expected.mode : undefined);
      expect(hymn?.notation.rhythmicCharacter).toBe(expected.rhythmicCharacter);
      expect(hymn?.melody.score?.phrases).toEqual(expected.phrases);
      expect(
        hymn?.melody.notes.map(({ pitch, duration, tie }) => ({
          pitch,
          duration,
          ...(tie ? { tie } : {}),
        })),
      ).toEqual(expected.events);
    }
  });

  it('uses only structured notation and generated ABC for bundled hymns', () => {
    for (const hymn of BUILTIN_HYMNS) {
      expect(hymn.melody.notationFormat).toBe('abc');
      expect(hymn.melody.notation).toMatch(/^X:/);
      expect(hymn.notation.sections.length).toBeGreaterThan(0);
      expect(
        hymn.tags.some((tag) => ['English', 'Latin', 'Spanish', 'Welsh', 'Anglican'].includes(tag)),
      ).toBe(false);
    }
  });
});
