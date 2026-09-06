import { Link, useParams } from "react-router-dom";
import { PageMeta } from "../page-meta";
import { getSongGuide, getSongSync } from "./song-catalog";
import { SongGuideContent } from "./song-guide-content";

export function SongGuidePage() {
  const { slug = "" } = useParams();
  const song = getSongGuide(slug);

  if (!song) {
    return (
      <>
        <PageMeta
          description="요청한 스키마스위치 콜가이드 곡을 찾을 수 없습니다."
          title="노래를 찾을 수 없음"
        />
        <main className="site-shell song-guide-page">
          <header className="subpage-header">
            <Link className="mini-wordmark" to="/">
              <span><span className="wordmark-outline">S</span>UKIMA</span>
              <span>SWITCH</span>
            </Link>
            <Link className="back-link" to="/call-guide">← SONGS</Link>
          </header>
          <section className="song-guide-empty">
            <span>UNKNOWN SONG</span>
            <h1>노래를 찾을 수 없습니다.</h1>
            <Link to="/call-guide">곡 목록으로 돌아가기 →</Link>
          </section>
        </main>
      </>
    );
  }

  const publishedSyncData = getSongSync(song.slug);

  return (
    <>
      <PageMeta
        description={`영상과 함께 보는 스키마스위치 ${song.title} 비공식 콜가이드`}
        title={`${song.title} 콜가이드`}
      />
      <main className="site-shell song-guide-page">
        <header className="subpage-header">
          <Link className="mini-wordmark" to="/">
            <span><span className="wordmark-outline">S</span>UKIMA</span>
            <span>SWITCH</span>
          </Link>
          <Link className="back-link" to="/call-guide">← SONGS</Link>
        </header>

        <section className="song-guide-heading">
          <div>
            <p className="eyebrow">
              CALL GUIDE · {String(song.order).padStart(2, "0")}
            </p>
            <h1>{song.title}</h1>
            <p className="song-reading">{song.reading}</p>
          </div>
          <p className="song-guide-summary">{song.summary}</p>
        </section>

        <SongGuideContent publishedSyncData={publishedSyncData} song={song} />

        <footer className="site-footer song-guide-footer">
          <span>UNOFFICIAL CALL GUIDE</span>
          <Link to="/call-guide">SONG LIST →</Link>
        </footer>
      </main>
    </>
  );
}
