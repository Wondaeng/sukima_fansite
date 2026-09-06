import type {
  PublishedSongSync,
  SongGuideData,
  SongSummary,
} from "./song-types";

const songModules = import.meta.glob<SongGuideData>("./songs/*.json", {
  eager: true,
  import: "default",
});

const syncModules = import.meta.glob<PublishedSongSync>("./song-sync/*.json", {
  eager: true,
  import: "default",
});

export const songGuides = Object.values(songModules).sort(
  (left, right) => left.order - right.order,
);

const syncBySlug = new Map(
  Object.entries(syncModules).map(([path, sync]) => [
    path.split("/").at(-1)?.replace(/\.json$/, "") ?? "",
    sync,
  ]),
);

export const songSummaries: SongSummary[] = songGuides.map((song) => ({
  revision: song.revision,
  slug: song.slug,
  order: song.order,
  title: song.title,
  reading: song.reading,
  guide: song.guide,
  ready: Boolean(song.videoId && song.lyrics.length > 0),
}));

export function getSongGuide(slug: string) {
  return songGuides.find((song) => song.slug === slug);
}

export function getSongSync(slug: string) {
  return syncBySlug.get(slug);
}
