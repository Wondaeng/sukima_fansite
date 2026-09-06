import { Link } from "react-router-dom";
import { PageMeta } from "./page-meta";

export function HomePage() {
  return (
    <>
      <PageMeta description="스키마스위치 비공식 팬 콜가이드" />
      <main className="site-shell home-page">
      <header className="site-header">
        <Link className="wordmark" to="/" aria-label="홈으로 이동">
          <span className="wordmark-line">
            <span className="wordmark-outline">S</span>UKIMA
          </span>
          <span className="wordmark-line">SWITCH</span>
        </Link>
        <p className="site-edition">
          UNOFFICIAL<br />FAN CALL GUIDE
        </p>
      </header>

      <section className="home-grid" aria-labelledby="home-title">
        <figure className="poster-block">
          <div className="poster-frame">
            <img
              src="/sukimaswitch-poster.png"
              alt="스키마스위치 POPMAN’S WORLD 2026 서울 공연 포스터"
              width={960}
              height={1200}
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <figcaption>
            POPMAN&apos;S WORLD 2026 IN SEOUL · 2026.06.20
          </figcaption>
        </figure>

        <div className="home-directory">
          <div className="intro-copy">
            <p className="eyebrow">FOR THE NEXT SING-ALONG</p>
            <h1 id="home-title">
              스키마스위치,
              <br />반년만에 재내한 결정!
            </h1>
          </div>

          <nav aria-label="메인 메뉴">
            <ol className="menu-list">
              <li>
                <Link className="menu-entry menu-entry-primary" to="/call-guide">
                  <span className="menu-number">01</span>
                  <span>
                    <strong>콜가이드</strong>
                    <small>CALL GUIDE</small>
                  </span>
                  <span className="menu-arrow" aria-hidden="true">↗</span>
                </Link>
              </li>
              <li>
                <div className="menu-entry menu-entry-muted" aria-disabled="true">
                  <span className="menu-number">02</span>
                  <span>
                    <strong>공연정보</strong>
                    <small>SHOWS · 준비 중</small>
                  </span>
                  <span className="menu-mark" aria-hidden="true">—</span>
                </div>
              </li>
              <li>
                <div className="menu-entry menu-entry-muted" aria-disabled="true">
                  <span className="menu-number">03</span>
                  <span>
                    <strong>QUIZ</strong>
                    <small>QUIZ · 준비 중</small>
                  </span>
                  <span className="menu-mark" aria-hidden="true">—</span>
                </div>
              </li>
            </ol>
          </nav>

          <aside className="next-show" aria-label="다음 공연 카운트다운">
            <div>
              <span>NEXT SHOW</span>
              <strong>일정 등록 전</strong>
            </div>
            <p>다음 공연이 정해지면 이곳에서 카운트다운이 시작됩니다.</p>
          </aside>
        </div>
      </section>

      <footer className="site-footer">
        <span>SUKIMA SWITCH UNOFFICIAL FAN SITE</span>
        <span>MADE FOR THE CROWD</span>
      </footer>
      </main>
    </>
  );
}
