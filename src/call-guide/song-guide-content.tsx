import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { CONTENT_TOOLS_ENABLED } from "./content-tools";
import { SongGuidePlayer } from "./song-player";
import type { PublishedSongSync, SongGuideData } from "./song-types";

const DeveloperLyricsEditor = CONTENT_TOOLS_ENABLED
  ? lazy(() => import("./song-lyrics-editor"))
  : null;

export function SongGuideContent({
  song,
  publishedSyncData,
}: {
  song: SongGuideData;
  publishedSyncData?: PublishedSongSync;
}) {
  const [searchParams] = useSearchParams();
  const editMode =
    CONTENT_TOOLS_ENABLED && searchParams.get("edit") === "1";

  if (editMode && DeveloperLyricsEditor) {
    return (
      <Suspense fallback={<p className="guide-note">가사 편집기를 여는 중…</p>}>
        <DeveloperLyricsEditor song={song} />
      </Suspense>
    );
  }

  if (song.videoId && song.lyrics.length > 0) {
    return (
      <SongGuidePlayer
        key={song.slug}
        publishedSyncData={publishedSyncData}
        song={song}
      />
    );
  }

  return (
    <section className="song-guide-empty song-guide-pending">
      <span>GUIDE IN PREPARATION</span>
      <h2>이 곡의 콜가이드를 준비하고 있어요.</h2>
      <p>
        콘텐츠 작업 모드에서는 주소 뒤에 <code>?edit=1</code>을 붙여 가사를 등록할 수 있습니다.
      </p>
    </section>
  );
}
