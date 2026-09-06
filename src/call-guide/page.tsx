import { Link } from "react-router-dom";
import { PageMeta } from "../page-meta";
import { songSummaries } from "./song-catalog";
import { SongList } from "./song-list";

export function CallGuidePage() {
  return (
    <>
      <PageMeta
        description="스키마스위치 노래별 비공식 콜가이드"
        title="콜가이드"
      />
      <main className="site-shell guide-page">
      <header className="subpage-header">
        <Link className="mini-wordmark" to="/">
          <span><span className="wordmark-outline">S</span>UKIMA</span>
          <span>SWITCH</span>
        </Link>
        <Link className="back-link" to="/">← HOME</Link>
      </header>

      <section className="guide-heading">
        <p className="eyebrow">SECTION 01 · CALL GUIDE</p>
        <h1>스키마스위치의 노래를<br />함께 연습해 보아요</h1>
        <p className="guide-note">곡을 선택하면 영상과 함께 콜 타이밍을 확인할 수 있습니다.</p>
      </section>

      <SongList songs={songSummaries} />

      <footer className="site-footer">
        <span>CALL GUIDE · PREVIEW</span>
        <Link to="/">HOME ↗</Link>
      </footer>
      </main>
    </>
  );
}
