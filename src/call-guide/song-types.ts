export type LyricToken = {
  text: string;
  call?: boolean;
};

export type LyricLine = {
  id: string;
  start: number;
  end: number;
  original: LyricToken[];
  pronunciation: LyricToken[];
  translation: LyricToken[];
  breakBefore?: boolean;
};

export type GuideKind = "sing" | "response" | "action" | "cheer";

export type GuideCue = {
  id: string;
  kind: GuideKind;
  title: string;
  detail: string;
  anchorLineId?: string;
  start?: number;
  end?: number;
  pattern?: string;
};

export type PublishedLineSync = {
  id: string;
  syllablesMs: number[];
};

export type PublishedInterlude = {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
};

export type PublishedCue = Omit<GuideCue, "start" | "end"> & {
  startMs?: number;
  endMs?: number;
};

export type PublishedSongSync = {
  revision: number;
  videoId: string;
  lines: PublishedLineSync[];
  cues: PublishedCue[];
  interludes?: PublishedInterlude[];
};

export type SongGuideData = {
  revision: number;
  slug: string;
  order: number;
  title: string;
  reading: string;
  guide: string;
  summary: string;
  videoId: string;
  lyrics: LyricLine[];
  cues: GuideCue[];
};

export type SongSummary = Pick<
  SongGuideData,
  "revision" | "slug" | "order" | "title" | "reading" | "guide"
> & {
  ready: boolean;
};
