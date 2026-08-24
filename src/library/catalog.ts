import type { LiturgicalCelebration, LiturgicalDay } from '../liturgical/litcal.js';
import {
  createLiturgicalTags,
  inferLiturgicalTags,
  seasonId,
  type LiturgicalOfficeId,
  type LiturgicalTags,
} from '../liturgical/taxonomy.js';
import type { AssetDefinition, AssetLibrary } from './library.js';

export type SelectionStrategy = 'random' | 'sequential' | 'fixed';
export type HymnMatchLevel = 'exact-feast' | 'saint' | 'category' | 'season' | 'general' | 'fixed' | 'none';

/**
 * Broad devotional themes for an hour. These are scoring hints only: they do
 * not add a canonical-hour tag to a hymn and therefore never make it an
 * official hymn of that hour.
 */
const CANONICAL_HOUR_THEMES: Readonly<Record<LiturgicalOfficeId, readonly string[]>> = {
  // In the reformed Roman Hours, Matins is the Office of Readings; its
  // defining character is meditation on Scripture and spiritual writers.
  matins: ['contemplative'],
  lauds: ['praise'],
  // Terce, Sext, and None commemorate the Passion and the first preaching
  // of the Gospel (GILH 75), rather than having a generic work-day theme.
  daytime: ['passion'],
  vespers: ['thanksgiving'],
  // Compline's psalmody evokes confidence in God and its conclusion asks for
  // a quiet night (GILH 88, 91).
  compline: ['confidence'],
};

const SCORE = {
  feast: 100,
  saint: 80,
  canonicalHour: 55,
  canonicalHourTheme: 50,
  category: 45,
  season: 35,
} as const;

/** A reusable query shared by hymn selection and future liturgical asset catalogs. */
export interface HymnQuery {
  feastIds?: string[];
  categoryIds?: string[];
  seasonIds?: string[];
  officeIds?: string[];
  canonicalHours?: string[];
  /** Preferred office for automatic selection; unlike canonicalHours in list(), this is not a hard filter. */
  preferredCanonicalHours?: string[];
  strategy?: SelectionStrategy;
  fixedAssetId?: string;
  seed?: string | number;
  recentExclusion?: number;
  /** Hymns already played for the local schedule date. Automatic selection heavily penalises these. */
  alreadyPlayed?: string[];
}

export interface HymnSelection {
  asset?: AssetDefinition;
  candidates: AssetDefinition[];
  matchedBy: HymnMatchLevel;
  celebration?: LiturgicalCelebration;
  scoring?: Array<{ id: string; score: number; alreadyPlayed: boolean }>;
  selectedScore?: number;
  selectedRank?: number;
  selectedScoreBreakdown?: Array<{ label: string; score: number }>;
  reusedPlayedAsset?: boolean;
}

type AssetProvider = AssetLibrary | AssetDefinition[] | (() => AssetDefinition[]);

/**
 * Catalogs liturgical metadata independently from rendering and scheduling.
 * The same provider shape can later be used for chants, recordings, prayers,
 * or bell sequences without moving feast logic into those asset definitions.
 */
export class HymnCatalog {
  private readonly recent = new Map<string, string[]>();
  private readonly cursors = new Map<string, number>();

  constructor(private readonly provider: AssetProvider) {}

  resetDay(date: string) {
    this.recent.delete(date);
  }

  list(query: HymnQuery = {}): AssetDefinition[] {
    return this.all().filter((asset) => matchesQuery(asset, query));
  }

  selectForDay(day: LiturgicalDay, query: HymnQuery = {}): HymnSelection {
    const available = this.all().filter((asset) => matchesContext(asset, query));
    const celebration = day.primaryCelebration ?? day.celebrations[0];

    if (query.fixedAssetId) {
      const fixed = available.find((asset) => asset.id === query.fixedAssetId);
      if (fixed) return { asset: fixed, candidates: [fixed], matchedBy: 'fixed', celebration };
    }

    const explicitFeast = values(query.feastIds);
    const explicitCategory = values(query.categoryIds);
    const explicitSeason = values(query.seasonIds);
    const automatic = !explicitFeast.length && !explicitCategory.length && !explicitSeason.length;
    const celebrationTags = celebration?.liturgicalTags ?? createLiturgicalTags();
    const feastTargets = explicitFeast.length
      ? explicitFeast
      : automatic
        ? celebrationTags.feasts
        : [];
    const saintTargets = automatic ? celebrationTags.saints : [];
    const categoryTargets = explicitCategory.length
      ? explicitCategory
      : automatic
        ? celebrationTags.categories.filter((category) => normalise(category) !== 'general')
        : [];
    const seasonTargets = explicitSeason.length
      ? explicitSeason
        : values([...day.seasonIds, seasonId(day.season)]);
    const preferredHours = values(query.preferredCanonicalHours ?? query.canonicalHours);

    if (automatic) {
      return this.chooseScored(available, day, query, celebration, {
        feastTargets,
        saintTargets,
        categoryTargets,
        seasonTargets,
        preferredHours,
      });
    }

    const tiers: Array<{ level: HymnMatchLevel; ids: string[]; field: keyof LiturgicalTags }> = [
      { level: 'exact-feast', ids: feastTargets, field: 'feasts' },
      { level: 'saint', ids: saintTargets, field: 'saints' },
      { level: 'category', ids: categoryTargets, field: 'categories' },
      { level: 'season', ids: seasonTargets, field: 'seasons' },
    ];
    const candidatesForTier = (tier: (typeof tiers)[number], officeOnly: boolean): AssetDefinition[] => {
      return available.filter((asset) => {
        const tags = assetTags(asset);
        return (
          intersects(tags[tier.field] as string[], tier.ids) &&
          (!officeOnly || intersects(tags.canonicalHours, preferredHours))
        );
      });
    };
    const selectTier = (officeOnly: boolean): HymnSelection | undefined => {
      for (const tier of tiers) {
        const candidates = candidatesForTier(tier, officeOnly);
        if (candidates.length) return this.choose(candidates, tier.level, day, query, celebration);
      }
      return undefined;
    };
    if (preferredHours.length) {
      // LitCal establishes the match tier first. The selected hour only
      // narrows that tier when an hour-tagged hymn exists.
      for (const tier of tiers) {
        const candidates = candidatesForTier(tier, false);
        if (!candidates.length) continue;
        const officeCandidates = candidatesForTier(tier, true);
        return this.choose(officeCandidates.length ? officeCandidates : candidates, tier.level, day, query, celebration);
      }
    }

    const ordinarySelection = selectTier(false);
    if (ordinarySelection) return ordinarySelection;

    const general = available.filter((asset) => {
      const tags = assetTags(asset);
      return (
        tags.seasons.includes('general') ||
        tags.categories.includes('general') ||
        !hasLiturgicalMetadata(tags)
      );
    });
    if (general.length) return this.choose(general, 'general', day, query, celebration);
    return { candidates: [], matchedBy: 'none', celebration };
  }

  private chooseScored(
    candidates: AssetDefinition[],
    day: LiturgicalDay,
    query: HymnQuery,
    celebration: LiturgicalCelebration | undefined,
    targets: { feastTargets: string[]; saintTargets: string[]; categoryTargets: string[]; seasonTargets: string[]; preferredHours: string[] },
  ): HymnSelection {
    if (!candidates.length) return { candidates: [], matchedBy: 'none', celebration };
    const alreadyPlayed = new Set(values(
      query.alreadyPlayed ?? (query.seed === undefined ? this.recent.get(day.date) : undefined),
    ));
    const scored = candidates.map((asset) => {
      const tags = asset.liturgicalTags ?? assetTags(asset);
      let score = 0;
      const breakdown: Array<{ label: string; score: number }> = [];
      const addMatch = (assetValues: string[], targetValues: string[], points: number) => {
        const matches = assetValues.filter((value) => targetValues.includes(value));
        if (matches.length) {
          score += points;
          breakdown.push({ label: matches.join(', '), score: points });
        }
      };
      addMatch(tags.feasts, targets.feastTargets, SCORE.feast);
      addMatch(tags.saints, targets.saintTargets, SCORE.saint);
      addMatch(tags.categories, targets.categoryTargets, SCORE.category);
      addMatch(tags.seasons, targets.seasonTargets, SCORE.season);
      addMatch(tags.canonicalHours, targets.preferredHours, SCORE.canonicalHour);
      const themes = targets.preferredHours.flatMap((hour) => CANONICAL_HOUR_THEMES[hour as LiturgicalOfficeId] ?? []);
      addMatch(tags.categories, themes, SCORE.canonicalHourTheme);
      addMatch(tags.offices, targets.preferredHours, 25);
      if (targets.seasonTargets.length && tags.seasons.length && !directIntersects(tags.seasons, targets.seasonTargets)) {
        score -= 45;
        breakdown.push({ label: 'out of season', score: -45 });
      }
      if (alreadyPlayed.has(asset.id)) {
        score -= 1000;
        breakdown.push({ label: 'Played', score: -1000 });
      }
      return { asset, score, breakdown };
    });

    // Prefer an unused hymn with a real liturgical fit. If the only unused
    // choices are out of season, the least-bad previously played hymn may win.
    const unused = scored.filter(({ asset }) => !alreadyPlayed.has(asset.id));
    const bestUnused = Math.max(...unused.map(({ score }) => score), Number.NEGATIVE_INFINITY);
    const pool = bestUnused > 0 ? unused : scored;
    const bestScore = Math.max(...pool.map(({ score }) => score));
    const tied = pool.filter(({ score }) => score === bestScore).map(({ asset }) => asset);
    const asset = this.chooseTie(tied, day, query, 'weighted');
    if (query.alreadyPlayed === undefined) {
      this.recent.set(day.date, [asset.id, ...(this.recent.get(day.date) ?? [])].slice(0, Math.max(1, query.recentExclusion ?? 3)));
    }
    const tags = assetTags(asset);
    const selectedScore = scored.find(({ asset: candidate }) => candidate.id === asset.id)?.score;
    const selectedRank = selectedScore === undefined
      ? undefined
      : [...scored]
        .sort((left, right) => right.score - left.score)
        .findIndex(({ asset: candidate }) => candidate.id === asset.id) + 1;
    const selectedScoreBreakdown = scored
      .find(({ asset: candidate }) => candidate.id === asset.id)?.breakdown
      ?.sort((left, right) => right.score - left.score);
    const matchedBy: HymnMatchLevel = directIntersects(tags.feasts, targets.feastTargets)
      ? 'exact-feast'
      : directIntersects(tags.saints, targets.saintTargets)
        ? 'saint'
        : directIntersects(tags.categories, targets.categoryTargets)
          ? 'category'
          : directIntersects(tags.seasons, targets.seasonTargets)
            ? 'season'
            : 'general';
    return {
      asset,
      candidates,
      matchedBy,
      celebration,
      scoring: scored.map(({ asset: candidate, score }) => ({
        id: candidate.id,
        score,
        alreadyPlayed: alreadyPlayed.has(candidate.id),
      })),
      selectedScore,
      selectedRank,
      selectedScoreBreakdown,
      reusedPlayedAsset: alreadyPlayed.has(asset.id),
    };
  }

  private chooseTie(candidates: AssetDefinition[], day: LiturgicalDay, query: HymnQuery, key: string): AssetDefinition {
    if (query.strategy === 'sequential') {
      const cursorKey = `${key}|${candidates.map((asset) => asset.id).join(',')}`;
      const cursor = this.cursors.get(cursorKey) ?? 0;
      const asset = candidates[cursor % candidates.length];
      this.cursors.set(cursorKey, (cursor + 1) % candidates.length);
      return asset;
    }
    const index = query.seed === undefined
      ? Math.floor(Math.random() * candidates.length)
      : stableHash(`${query.seed}|${day.date}|${key}|${candidates.map((asset) => asset.id).join(',')}`) % candidates.length;
    return candidates[index];
  }

  private choose(
    candidates: AssetDefinition[],
    level: HymnMatchLevel,
    day: LiturgicalDay,
    query: HymnQuery,
    celebration?: LiturgicalCelebration,
  ): HymnSelection {
    const strategy = query.strategy ?? 'random';
    const key = `${level}|${candidates.map((asset) => asset.id).join(',')}|${contextKey(query)}`;
    let pool = candidates;
    const recentExclusion = Math.max(0, Math.floor(query.recentExclusion ?? 1));

    if (strategy === 'fixed') {
      const asset = query.fixedAssetId
        ? candidates.find((candidate) => candidate.id === query.fixedAssetId)
        : candidates[0];
      return { asset, candidates, matchedBy: level, celebration };
    }

    if (strategy === 'sequential') {
      const cursor = this.cursors.get(key) ?? 0;
      const asset = candidates[cursor % candidates.length];
      this.cursors.set(key, (cursor + 1) % candidates.length);
      return { asset, candidates, matchedBy: level, celebration };
    }

    // Seeded selection is intentionally stateless: the same day/query/seed is
    // reproducible in tests and in a dry-run API call.
    const dailyKey = day.date;
    if (query.seed === undefined && recentExclusion > 0 && candidates.length > recentExclusion) {
      const previous = new Set(this.recent.get(dailyKey) ?? []);
      const withoutRecent = candidates.filter((candidate) => !previous.has(candidate.id));
      if (withoutRecent.length) pool = withoutRecent;
    }
    const index =
      query.seed === undefined
        ? Math.floor(Math.random() * pool.length)
        : stableHash(`${query.seed}|${day.date}|${key}`) % pool.length;
    const asset = pool[index];
    if (query.seed === undefined && recentExclusion > 0) {
      this.recent.set(dailyKey, [asset.id, ...(this.recent.get(dailyKey) ?? [])].slice(0, recentExclusion));
    }
    return { asset, candidates, matchedBy: level, celebration };
  }

  private all(): AssetDefinition[] {
    const raw = Array.isArray(this.provider)
      ? this.provider
      : typeof this.provider === 'function'
        ? this.provider()
        : this.provider.list();
    return raw
      .filter((asset) => asset.type === 'hymn')
      .map((asset) => ({ ...asset, liturgicalTags: assetTags(asset) }));
  }
}

function matchesQuery(asset: AssetDefinition, query: HymnQuery): boolean {
  const tags = assetTags(asset);
  return (
    (!query.feastIds?.length || intersects(tags.feasts, query.feastIds)) &&
    (!query.categoryIds?.length || intersects(tags.categories, query.categoryIds)) &&
    (!query.seasonIds?.length || intersects(tags.seasons, query.seasonIds)) &&
    (!query.officeIds?.length || intersects(tags.offices, query.officeIds)) &&
    (!query.canonicalHours?.length || intersects(tags.canonicalHours, query.canonicalHours))
  );
}

function matchesContext(asset: AssetDefinition, query: HymnQuery): boolean {
  return matchesQuery(asset, {
    ...query,
    feastIds: undefined,
    categoryIds: undefined,
    seasonIds: undefined,
    canonicalHours: undefined,
  });
}

function assetTags(asset: AssetDefinition): LiturgicalTags {
  const inferred = inferLiturgicalTags({
    key: asset.id,
    name: asset.name,
    feastTypes: asset.feastTypes,
    liturgicalSeasons: asset.liturgicalSeasons,
  });
  const explicit = asset.liturgicalTags;
  return createLiturgicalTags({
    seasons: [...inferred.seasons, ...(explicit?.seasons ?? [])],
    feasts: [...inferred.feasts, ...(explicit?.feasts ?? [])],
    solemnities: [...inferred.solemnities, ...(explicit?.solemnities ?? [])],
    memorials: [...inferred.memorials, ...(explicit?.memorials ?? [])],
    saints: [...inferred.saints, ...(explicit?.saints ?? [])],
    categories: [...inferred.categories, ...(explicit?.categories ?? [])],
    offices: [...inferred.offices, ...(explicit?.offices ?? [])],
    canonicalHours: [...inferred.canonicalHours, ...(explicit?.canonicalHours ?? [])],
  });
}

function hasLiturgicalMetadata(tags: LiturgicalTags): boolean {
  return [tags.seasons, tags.feasts, tags.categories, tags.offices, tags.canonicalHours].some(
    (values) => values.length > 0,
  );
}

function values(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map(normalise).filter(Boolean))];
}
function intersects(left: string[], right: string[]): boolean {
  const target = new Set(values(right));
  return values(left).some((value) => target.has(value));
}
function directIntersects(left: string[], right: string[]): boolean {
  const target = new Set(right);
  return left.some((value) => target.has(value));
}
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[·'’_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function contextKey(query: HymnQuery): string {
  return JSON.stringify({
    officeIds: query.officeIds,
    canonicalHours: query.canonicalHours,
    preferredCanonicalHours: query.preferredCanonicalHours,
  });
}
function stableHash(value: string): number {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
