import type { ArrangementPlan, Melody } from '../../melodies/types.js';
import type {
  LiturgicalCategoryId,
  LiturgicalFeastId,
  LiturgicalOfficeInput,
  LiturgicalSeasonInput,
  LiturgicalTags,
} from '../../liturgical/taxonomy.js';
import type { HymnNotation } from './notation/types.js';

export interface HymnLiturgicalMetadata {
  categories?: LiturgicalCategoryId[];
  seasons?: LiturgicalSeasonInput[];
  offices?: LiturgicalOfficeInput[];
  feasts?: LiturgicalFeastId[];
  solemnities?: LiturgicalFeastId[];
}

export interface HymnAsset {
  id: string;
  name: string;
  type: 'hymn';
  source: 'bundled';
  contentKind: 'traditional';
  melody: Melody;
  notation: HymnNotation;
  liturgicalTags: LiturgicalTags;
  liturgicalSeasons?: string[];
  feastTypes?: string[];
  description: string;
}

export interface HymnDefinition {
  id: string;
  name: string;
  liturgical?: HymnLiturgicalMetadata;
  notation: HymnNotation;
  arrangement: ArrangementPlan;
}
