import type { SelectionStrategy } from '../library/catalog.js';

export interface LiturgicalCondition {
  season?: string;
  seasons?: string[];
  rank?: string;
  feast?: string;
  feastIds?: string[];
  categoryIds?: string[];
  offices?: string[];
  canonicalHours?: string[];
  hymnTag?: string;
  strategy?: SelectionStrategy;
  /** @deprecated Use strategy; retained for existing schedule files. */
  rotation?: SelectionStrategy;
  fixedAssetId?: string;
  seed?: string | number;
  recentExclusion?: number;
}
export interface ScheduleEntry {
  id: string;
  name: string;
  enabled: boolean;
  days: number[];
  time: string;
  asset: string;
  output?: string;
  liturgical?: LiturgicalCondition;
}
export const DEFAULT_SCHEDULES: ScheduleEntry[] = [
  {
    id: 'westminster-quarter',
    name: 'Westminster Quarter',
    enabled: false,
    days: [0, 1, 2, 3, 4, 5, 6],
    time: '*/15',
    asset: 'test-bell',
  },
];
