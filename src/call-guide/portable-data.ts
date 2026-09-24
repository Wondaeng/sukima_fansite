import type { GuideCue, LyricLine, PublishedSongSync, SongGuideData } from "./song-types";

// Use the same published cue precedence and nearest-line anchoring as the player.
export function portableLines(song: SongGuideData, sync?: PublishedSongSync) {
  const cues: GuideCue[] = sync ? sync.cues.map(({ startMs, ...cue }) => ({ ...cue, start: startMs === undefined ? undefined : startMs / 1000 })) : song.cues;
  const timings = new Map(sync?.lines.map(line => [line.id, line.syllablesMs[0]]) ?? []);
  const anchored = cues.map(cue => {
    if (cue.anchorLineId || cue.start === undefined) return cue;
    const start = cue.start;
    const closest = song.lyrics.reduce<LyricLine | undefined>((best, line) => {
      const time = (timings.get(line.id) ?? line.start * 1000) / 1000;
      const bestTime = best ? (timings.get(best.id) ?? best.start * 1000) / 1000 : Infinity;
      return Math.abs(time - start) < Math.abs(bestTime - start) ? line : best;
    }, undefined);
    return { ...cue, anchorLineId: closest?.id };
  });
  return song.lyrics.map(line => ({
    ...line,
    cues: anchored.filter(cue => cue.anchorLineId === line.id),
  }));
}
export const cueNames = { sing: "떼창", response: "콜", action: "동작", cheer: "환호" };
