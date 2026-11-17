import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageMeta } from "./page-meta";
import { afterShowDay, getNextShowCountdown, wonderlivetStart, wonderlivetTimeLabel } from "./shows/wonderlivet";

const countdownUnits = ["일", "시간", "분", "초", "밀리초"];

function NextShowCountdown() {
  const [countdown, setCountdown] = useState(() => getNextShowCountdown(Date.now()));

  useEffect(() => {
    let frame: number;
    let midnightTimer: number | undefined;
    function tick() {
      const now = Date.now();
      const next = getNextShowCountdown(now);
      setCountdown(next);
      if (next.parts) frame = window.requestAnimationFrame(tick);
      else if (now < afterShowDay) midnightTimer = window.setTimeout(tick, afterShowDay - now);
    }
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(midnightTimer);
    };
  }, []);

  return (
    <aside className="next-show" aria-label="다음 공연 카운트다운">
      <div className="next-show-event">
        <span>NEXT SHOW</span>
        <strong><time dateTime={wonderlivetStart}>2026.11.22</time></strong>
        <p>{wonderlivetTimeLabel} 공연 시작 · 한국시간</p>
      </div>
      <div
        className="next-show-countdown"
        role="timer"
        aria-label={countdown.status ?? "공연 시작까지 남은 시간"}
      >
        {countdown.parts ? countdown.parts.map((value, i) => (
          <Fragment key={countdownUnits[i]}>
            {i > 0 && <span className="countdown-separator" aria-hidden="true">:</span>}
            <span className="countdown-part">
              <b>{value}</b>
              <small>{countdownUnits[i]}</small>
            </span>
          </Fragment>
        )) : <strong>{countdown.status}</strong>}
      </div>
    </aside>
  );
}

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
              src="/wonderlivet-2026.jpg"
              alt="WONDERLIVET 2026 스키마스위치 11월 22일 출연 포스터"
              width={1170}
              height={1462}
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <figcaption>
            WONDERLIVET 2026 · 2026.11.22
          </figcaption>
        </figure>

        <div className="home-directory">
          <div className="intro-copy">
            <p className="eyebrow">WONDERLIVET 2026</p>
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
                <Link className="menu-entry menu-entry-link" to="/shows">
                  <span className="menu-number">02</span>
                  <span>
                    <strong>공연정보</strong>
                    <small>SHOWS</small>
                  </span>
                  <span className="menu-arrow" aria-hidden="true">↗</span>
                </Link>
              </li>
              <li>
                <Link className="menu-entry menu-entry-link" to="/quiz">
                  <span className="menu-number">03</span>
                  <span>
                    <strong>QUIZ</strong>
                    <small>SUKIMA QUIZ</small>
                  </span>
                  <span className="menu-arrow" aria-hidden="true">↗</span>
                </Link>
              </li>
            </ol>
          </nav>

          <NextShowCountdown />
        </div>
      </section>

      <footer className="site-footer">
        <span>SUKIMA SWITCH UNOFFICIAL FAN SITE</span>
      </footer>
      </main>
    </>
  );
}
