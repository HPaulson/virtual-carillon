import type { LiturgicalCalendarName, LiturgicalDay } from '../liturgical/litcal.js';
import type { HymnCatalog } from '../library/catalog.js';

export interface HymnOrderOptions {
  date: string;
  calendar?: LiturgicalCalendarName;
  count?: number;
  alreadyPlayed?: string[];
}

export interface HymnOrderEntry {
  order: number;
  id: string;
  name: string;
  rank?: number;
  points: number;
  contributions: Array<{ label: string; points: number }>;
}

/**
 * Dry-run the automatic hymn selector, reserving each result before asking
 * for the next one. This deliberately does not render audio or update the
 * catalog's in-memory recent-selection state.
 */
export async function previewHymnOrder(
  catalog: HymnCatalog,
  getDay: (date: string, calendar?: LiturgicalCalendarName) => Promise<LiturgicalDay | undefined>,
  options: HymnOrderOptions,
): Promise<HymnOrderEntry[]> {
  const day = (await getDay(options.date, options.calendar)) ?? neutralDay(options.date);
  const reserved = new Set(options.alreadyPlayed ?? []);
  const limit = Math.min(options.count ?? catalog.list().length, catalog.list().length);
  const entries: HymnOrderEntry[] = [];

  for (let order = 1; order <= limit; order += 1) {
    const selection = catalog.selectForDay(day, {
      alreadyPlayed: [...reserved],
      recentExclusion: 0,
    });
    if (!selection.asset) break;

    const asset = selection.asset;
    const contributions = (selection.selectedScoreBreakdown ?? []).map(({ label, score }) => ({
      label,
      points: score,
    }));
    entries.push({
      order,
      id: asset.id,
      name: asset.name ?? asset.id,
      rank: selection.selectedRank,
      points: selection.selectedScore ?? 0,
      contributions,
    });
    reserved.add(asset.id);
  }

  return entries;
}

export function formatHymnOrderEntry(entry: HymnOrderEntry): string {
  const details = entry.contributions.length
    ? entry.contributions.map(({ label, points }) => `${label} (${points})`).join(', ')
    : 'no scoring contributions (0)';
  const rank = entry.rank ?? 'n/a';
  return `${entry.order}. ${entry.name} (${entry.id}) • ${details} • ${entry.points}, #${rank}`;
}

function neutralDay(date: string): LiturgicalDay {
  return { date, seasonIds: [], celebrations: [], source: 'cli-fallback' };
}
