import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageMeta } from "./page-meta";

const NEXT_SHOW_START = Date.parse("2026-11-22T00:00:00+09:00");
const NEXT_SHOW_END = Date.parse("2026-11-23T00:00:00+09:00");
const DAY_MS = 24 * 60 * 60 * 1000;

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function getNextShowCountdown(now: number) {
  if (now >= NEXT_SHOW_END) {
    return { dayLabel: "CLOSED", remaining: "일정 종료" };
  }

  if (now >= NEXT_SHOW_START) {
    return { dayLabel: "D-DAY", remaining: "오늘 공연" };
  }

  const difference = NEXT_SHOW_START - now;
  const hours = Math.floor((difference % DAY_MS) / (60 * 60 * 1000));
  const minutes = Math.floor((difference % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((difference % (60 * 1000)) / 1000);

  return {
    dayLabel: `D-${Math.ceil(difference / DAY_MS)}`,
    remaining: `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`,
  };
}

function NextShowCountdown() {
  const [countdown, setCountdown] = useState(() => getNextShowCountdown(Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getNextShowCountdown(Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside className="next-show" aria-label="다음 공연 카운트다운">
      <div className="next-show-event">
        <span>NEXT SHOW</span>
        <strong>2026.11.22</strong>
        <p>공연 시작 시각 미정 · 서울 시간 기준</p>
      </div>
      <div
        className="next-show-countdown"
        role="timer"
        aria-label={`${countdown.dayLabel}, ${countdown.remaining} 남음`}
      >
        <strong className="countdown-day">{countdown.dayLabel}</strong>
        <time className="countdown-clock" dateTime="2026-11-22">
          {countdown.remaining}
        </time>
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

          <NextShowCountdown />
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
