export interface Story {
  id: string;
  title: string;
  cleanTitle: string;
  youtubeId: string;
  youtubeUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  duration: string;
  position?: number;
  collection: string;
  characterSeries?: string;
  author?: string;
}

export interface CollectionItem {
  slug: string;
  name: string;
  bengali: string;
  count: number;
}
