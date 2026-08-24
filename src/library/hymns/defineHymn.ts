import { parseAbc } from '../../melodies/parsers.js';
import type { ArrangementPlan } from '../../melodies/types.js';
import {
  createLiturgicalTags,
  seasonId,
  type LiturgicalOfficeId,
} from '../../liturgical/taxonomy.js';
import { notationPhraseBeats, notationToAbc } from './notation/toAbc.js';
import type { HymnAsset, HymnDefinition } from './types.js';

const DEFAULT_LICENSE = 'Public-domain melody; source transcription credited in this asset';

export function defineHymn(definition: HymnDefinition): HymnAsset {
  const abc = notationToAbc(definition.notation, { id: definition.id, title: definition.name });
  const imported = parseAbc(abc, definition.id);
  const liturgical = definition.liturgical ?? {};
  const offices = liturgical.offices ?? [];
  const arrangement: ArrangementPlan = definition.arrangement;
  const license = definition.license ?? DEFAULT_LICENSE;
  const rhythmicCharacter = definition.notation.rhythmicCharacter ?? 'metered';
  const liturgicalTags = createLiturgicalTags({
    seasons: (liturgical.seasons ?? []).map(seasonId),
    categories: [...(liturgical.categories ?? []), 'general'],
    feasts: liturgical.feasts,
    solemnities: liturgical.solemnities,
    offices: offices.map(toOfficeId),
    canonicalHours: offices.map(toOfficeId),
  });
  const phrases = notationPhraseBeats(definition.notation);
  const melody = {
    ...imported,
    id: definition.id,
    name: definition.name,
    bpm: definition.notation.tempo ?? imported.bpm,
    source: definition.source,
    sourceUrl: definition.sourceUrl,
    license,
    notationFormat: 'abc' as const,
    notation: abc,
    tags: definition.tags,
    liturgicalSeasons: liturgical.seasons,
    officeUsage: offices,
    feastTypes: undefined,
    mode: definition.notation.mode,
    rhythmicCharacter,
    arrangement,
    liturgicalTags,
    notes: imported.notes.map((note) =>
      rhythmicCharacter === 'free' && note.pitch !== 'rest'
        ? { ...note, velocity: 0.84, voice: 'chant' }
        : note,
    ),
    score: imported.score
      ? {
          ...imported.score,
          id: definition.id,
          name: definition.name,
          tempoBpm: definition.notation.tempo ?? imported.bpm,
          mode: definition.notation.mode,
          rhythmicCharacter,
          events:
            rhythmicCharacter === 'free'
              ? imported.score.events.map((event) => ({ ...event, velocity: 0.84, voice: 'chant' }))
              : imported.score.events,
          arrangement,
          phrases: phrases.length ? phrases : undefined,
          provenance: {
            source: definition.source,
            sourceUrl: definition.sourceUrl,
            license,
            notationFormat: 'abc' as const,
          },
        }
      : undefined,
  };
  return {
    id: definition.id,
    name: definition.name,
    type: 'hymn',
    source: 'bundled',
    contentKind: 'traditional',
    melody,
    notation: definition.notation,
    liturgicalTags,
    tags: definition.tags,
    liturgicalSeasons: liturgical.seasons,
    feastTypes: undefined,
    sourceUrl: definition.sourceUrl,
    license,
    description: `${definition.name}: ${definition.source}. The source melody is serialized from structured notation and rendered as a carillon arrangement; no modern recording is bundled.`,
  };
}

function toOfficeId(value: string): LiturgicalOfficeId {
  return value.toLowerCase().replace(/\s+/g, '-') as LiturgicalOfficeId;
}
