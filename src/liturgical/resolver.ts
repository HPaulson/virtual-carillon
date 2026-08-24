import { HymnCatalog, HymnQuery } from '../library/catalog.js';
import { AssetLibrary } from '../library/library.js';
import { LiturgicalCalendarClient, LiturgicalDay } from './litcal.js';
import { LiturgicalCondition, ScheduleEntry } from '../scheduler/types.js';
import { seasonId } from './taxonomy.js';

export class LiturgicalResolver {
  private readonly catalog: HymnCatalog;

  constructor(
    private readonly calendar: LiturgicalCalendarClient,
    library: AssetLibrary,
    catalog = new HymnCatalog(library),
  ) {
    this.catalog = catalog;
  }

  async resolve(entry: ScheduleEntry, now: Date): Promise<string> {
    const condition = entry.liturgical;
    if (!condition) return entry.asset;
    const day = await this.calendar.getDay(now);
    if (!day || !conditionMatches(day, condition)) return entry.asset;
    const selection = this.catalog.selectForDay(day, toHymnQuery(condition));
    return selection.asset?.id ?? entry.asset;
  }
}

export function conditionMatches(day: LiturgicalDay, condition: LiturgicalCondition): boolean {
  const celebrations = day.celebrations;
  const seasons = [...(condition.seasons ?? []), ...(condition.season ? [condition.season] : [])];
  const feasts = [...(condition.feastIds ?? []), ...(condition.feast ? [condition.feast] : [])];
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

function toHymnQuery(condition: LiturgicalCondition): HymnQuery {
  const seasons = [
    ...(condition.seasons ?? []),
    ...(condition.season ? [condition.season] : []),
  ].map((value) => seasonId(value));
  const feasts = [...(condition.feastIds ?? []), ...(condition.feast ? [condition.feast] : [])].map(
    stableId,
  );
  return {
    feastIds: feasts.length ? feasts : undefined,
    categoryIds: condition.categoryIds,
    seasonIds: seasons.length ? seasons : undefined,
    officeIds: condition.offices,
    canonicalHours: condition.canonicalHours,
    tags: condition.hymnTag ? [condition.hymnTag] : undefined,
    strategy: condition.strategy ?? condition.rotation ?? 'random',
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
