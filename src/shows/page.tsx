import { useState } from "react";
import { Link } from "react-router-dom";
import { FanPageShell } from "../fan-page-shell";
import "../fan-pages.css";

export function ShowsPage() {
  const [showEnded] = useState(() => Date.now() >= Date.parse("2026-11-23T00:00:00+09:00"));
  return <FanPageShell title="공연 정보" section="SECTION 02 · SHOWS" description="스키마스위치 공연 일정 및 예매 안내">
    <article className="show-feature" aria-labelledby="featured-show-title">
      <div className="show-date-panel">
        <span className="eyebrow">{showEnded ? "PAST SHOW IN KOREA" : "NEXT SHOW IN KOREA"}</span>
        <span className="show-year">2026</span><time dateTime="2026-11-22" className="show-date">11.22<span>SUNDAY · 일요일</span></time>
      </div>
      <div className="show-details">
        <span className="show-badge">{showEnded ? "공연 종료" : "내한 · 페스티벌"}</span>
        <h2 id="featured-show-title">WONDERLIVET<br /><span>2026</span></h2>
        <dl className="show-facts">
          <div><dt>출연일</dt><dd>2026년 11월 22일 (일)</dd></div>
          <div><dt>장소</dt><dd>일산 KINTEX<span>세부 홀은 주최 측 최신 공지를 확인해 주세요.</span></dd></div>
          <div><dt>출연 시간</dt><dd>추후 발표</dd></div>
          <div><dt>예매 안내</dt><dd>페스티벌 공식 홈페이지에서 확인</dd></div>
        </dl>
        <div className="show-links"><a className="fan-button" href="https://wonderli.vet" target="_blank" rel="noreferrer">공식 홈페이지 · 예매 안내 ↗</a><Link className="fan-button fan-button-secondary" to="/call-guide">콜가이드 ↗</Link></div>
        <a className="fan-text-link show-source" href="https://www.office-augusta.com/sukimaswitch/live/?id=308" target="_blank" rel="noreferrer">스키마스위치 공식 출연 공지 ↗</a>
      </div>
    </article>
    <section className="show-more" aria-labelledby="more-shows-title">
      <div className="section-title-row"><h2 id="more-shows-title">더 많은 공연 소식</h2><span>LIVE ARCHIVE & TOUR</span></div>
      <article className="show-list-item"><span className="eyebrow">JAPAN TOUR</span><div><h3>POPMAN&apos;S CARNIVAL vol.3</h3><p>2026.05.21 — 10.31 · 일본 전국 투어</p></div><a className="fan-text-link" href="https://www.office-augusta.com/sukimaswitch/live/?id=187" target="_blank" rel="noreferrer" aria-label="POPMAN'S CARNIVAL vol.3 공식 일정">공식 일정 ↗</a></article>
      <article className="show-list-item"><span className="eyebrow">PAST · SEOUL</span><div><h3>POPMAN&apos;S WORLD 2026 in Seoul</h3><p>2026.06.20 — 06.21 · YES24 원더로크홀</p></div><a className="fan-text-link" href="https://www.office-augusta.com/sukimaswitch/live/?id=273" target="_blank" rel="noreferrer" aria-label="POPMAN'S WORLD 2026 in Seoul 공식 공지">공식 공지 ↗</a></article>
    </section>
    <p className="fan-note">공식 공지 확인: 2026.09.25 · 일정과 예매 정보는 변경될 수 있으니 방문 전 주최 측 공지를 확인해 주세요.</p>
  </FanPageShell>;
}
