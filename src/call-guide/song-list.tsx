import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { CONTENT_TOOLS_ENABLED } from "./content-tools";
import { SongListRows } from "./song-list-rows";
import type { SongSummary } from "./song-types";

const DeveloperSongListEditor = CONTENT_TOOLS_ENABLED
  ? lazy(() => import("./song-list-editor"))
  : null;

export function SongList({ songs }: { songs: SongSummary[] }) {
  const [searchParams] = useSearchParams();
  const editMode =
    CONTENT_TOOLS_ENABLED && searchParams.get("edit") === "1";

  if (editMode && DeveloperSongListEditor) {
    return (
      <Suspense fallback={<p className="guide-note">목록 편집기를 여는 중…</p>}>
        <DeveloperSongListEditor />
      </Suspense>
    );
  }

  return <SongListRows songs={songs} />;
}
