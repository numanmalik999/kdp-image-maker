export type TrimSize = '6x9' | '5x8' | '8.5x11';
export type FontSize = 10 | 11 | 12;
export type PageActivityType = 'coloring' | 'tracing' | 'story' | 'maze' | 'dot-to-dot' | 'image';
export type EditorTab = 'pages' | 'front_cover' | 'back_cover';

export interface BookSettings {
  title: string;
  author: string;
  trimSize: TrimSize;
  fontSize: FontSize;
  targetPages: number;
  hasFrontCover: boolean;
  hasBackCover: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Page {
  id: string;
  pageNumber: number;
  content: string;
  imageUrl?: string;
  activityTypes?: PageActivityType[]; // Changed to array
}

export interface TrimDimensions {
  width: number;
  height: number;
  unit: 'in';
}

export const TRIM_SIZES: Record<TrimSize, TrimDimensions> = {
  '6x9': { width: 6, height: 9, unit: 'in' },
  '5x8': { width: 5, height: 8, unit: 'in' },
  '8.5x11': { width: 8.5, height: 11, unit: 'in' },
};