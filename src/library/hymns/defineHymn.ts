import { parseAbc } from '../../melodies/parsers.js';
import type { ArrangementPlan } from '../../melodies/types.js';
import {
  createLiturgicalTags,
  seasonId,
  type LiturgicalOfficeInput,
  type LiturgicalOfficeId,
} from '../../liturgical/taxonomy.js';
import { notationPhraseBeats, notationToAbc } from './notation/toAbc.js';
import type { HymnAsset, HymnDefinition } from './types.js';

export function defineHymn(definition: HymnDefinition): HymnAsset {
  const abc = notationToAbc(definition.notation, { id: definition.id, title: definition.name });
  const imported = parseAbc(abc, definition.id);
  const liturgical = definition.liturgical ?? {};
  const offices = liturgical.offices ?? [];
  if (
    offices.length > 0 &&
    !(liturgical.categories?.length || liturgical.feasts?.length || liturgical.seasons?.length)
  ) {
    throw new Error(
      `Hymn ${definition.id} assigns a canonical hour without a liturgical category, feast, or season`,
    );
  }
  const arrangement: ArrangementPlan = definition.arrangement;
  const rhythmicCharacter = definition.notation.rhythmicCharacter ?? 'metered';
  const liturgicalTags = createLiturgicalTags({
    seasons: (liturgical.seasons ?? []).map(seasonId),
    // General is a fallback season, not a category every hymn should match.
    // Keeping it out of every asset prevents an unclassified celebration from
    // winning before Ordinary Time or another actual season.
    categories: liturgical.categories,
    feasts: liturgical.feasts,
    // Solemnity/memorial are celebration ranks supplied by LitCal. They are
    // not intrinsic hymn properties; feast association remains in `feasts`.
    offices: offices.map(toOfficeId),
    canonicalHours: offices.map(toOfficeId),
  });
  const phrases = notationPhraseBeats(definition.notation);
  const melody = {
    ...imported,
    id: definition.id,
    name: definition.name,
    bpm: definition.notation.tempo ?? imported.bpm,
    notationFormat: 'abc' as const,
    notation: abc,
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
    liturgicalSeasons: liturgical.seasons,
    feastTypes: undefined,
    description: 'Bundled carillon arrangement.',
  };
}

function toOfficeId(value: LiturgicalOfficeInput): LiturgicalOfficeId {
  return value.toLowerCase().replace(/\s+/g, '-') as LiturgicalOfficeId;
}
