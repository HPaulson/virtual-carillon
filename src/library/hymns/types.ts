import type { ArrangementPlan, Melody } from '../../melodies/types.js';
import type { LiturgicalTags } from '../../liturgical/taxonomy.js';
import type { HymnNotation } from './notation/types.js';

export interface HymnLiturgicalMetadata {
  categories?: string[];
  seasons?: string[];
  offices?: string[];
  feasts?: string[];
  solemnities?: string[];
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
  tags: string[];
  liturgicalSeasons?: string[];
  feastTypes?: string[];
  sourceUrl: string;
  license: string;
  description: string;
}

export interface HymnDefinition {
  id: string;
  name: string;
  source: string;
  sourceUrl: string;
  license?: string;
  tags: string[];
  liturgical?: HymnLiturgicalMetadata;
  notation: HymnNotation;
  arrangement: ArrangementPlan;
}
