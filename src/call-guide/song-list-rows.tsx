import { Link } from "react-router-dom";
import type { SongSummary } from "./song-types";

export function SongListRows({
  songs,
  editLinks = false,
}: {
  songs: SongSummary[];
  editLinks?: boolean;
}) {
  return (
    <ol className="song-list">
      {songs.map((song, index) => {
        const rowContent = (
          <>
            <span className="song-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="song-title-group">
              <strong>{song.title}</strong>
              <small>{song.reading}</small>
            </span>
            <span className="song-guide-type">{song.guide}</span>
            <span className="song-status">{song.ready ? "OPEN" : "SETUP"}</span>
          </>
        );

        return (
          <li key={song.slug}>
            <Link
              className="song-row song-row-link"
              to={`/call-guide/${song.slug}${editLinks ? "?edit=1" : ""}`}
            >
              {rowContent}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
