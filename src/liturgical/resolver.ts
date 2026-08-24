import type { HymnQuery, SelectionStrategy } from '../library/catalog.js';
import type { LiturgicalDay } from './litcal.js';
import { seasonId } from './taxonomy.js';

export interface LiturgicalCondition {
  seasons?: string[];
  rank?: string;
  feastIds?: string[];
  categoryIds?: string[];
  offices?: string[];
  canonicalHours?: string[];
  tags?: string[];
  strategy?: SelectionStrategy;
  fixedAssetId?: string;
  seed?: string | number;
  recentExclusion?: number;
}

export function conditionMatches(day: LiturgicalDay, condition: LiturgicalCondition): boolean {
  const celebrations = day.celebrations;
  const seasons = condition.seasons ?? [];
  const feasts = condition.feastIds ?? [];
  if (
    seasons.length &&
    !seasons.some(
      (value) =>
        day.seasonIds.includes(seasonId(value)) ||
        celebrations.some((event) => event.liturgicalTags.seasons.includes(seasonId(value))),
    )
  )
    return false;
  const rank = condition.rank;
  if (rank && !celebrations.some((event) => same(event.rank, rank) || same(event.rankId, rank)))
    return false;
  if (
    feasts.length &&
    !celebrations.some((event) =>
      feasts.some(
        (value) =>
          event.liturgicalTags.feasts.some((feast) => same(feast, value)) ||
          same(event.name, value) ||
          same(event.key, value) ||
          same(event.feastType, value),
      ),
    )
  )
    return false;
  return true;
}

export function toHymnQuery(condition: LiturgicalCondition): HymnQuery {
  const seasons = (condition.seasons ?? []).map((value) => seasonId(value));
  const feasts = (condition.feastIds ?? []).map(stableId);
  return {
    feastIds: feasts.length ? feasts : undefined,
    categoryIds: condition.categoryIds,
    seasonIds: seasons.length ? seasons : undefined,
    officeIds: condition.offices,
    preferredCanonicalHours: condition.canonicalHours,
    tags: condition.tags,
    strategy: condition.strategy ?? 'random',
    fixedAssetId: condition.fixedAssetId,
    seed: condition.seed,
    recentExclusion: condition.recentExclusion,
  };
}

function same(left: string | undefined, right: string): boolean {
  return left !== undefined && normalise(left) === normalise(right);
}
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[·'’\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function stableId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
