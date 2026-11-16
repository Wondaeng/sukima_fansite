export const wonderlivetStart = "2026-11-22T20:00:00+09:00";
export const wonderlivetTimeLabel = wonderlivetStart.slice(11, 16);

const startMs = Date.parse(wonderlivetStart);
const dayMs = 24 * 60 * 60 * 1000;
const showMidnight = Date.parse(`${wonderlivetStart.slice(0, 10)}T00:00:00+09:00`);
export const afterShowDay = showMidnight + dayMs;

export function getNextShowCountdown(now: number) {
  if (now >= afterShowDay) return { status: "일정 종료" };
  if (now >= startMs) return { status: "공연 시작" };

  const remaining = startMs - now;
  const hourMs = 60 * 60 * 1000;
  return {
    parts: [
      String(Math.floor(remaining / dayMs)).padStart(2, "0"),
      String(Math.floor((remaining % dayMs) / hourMs)).padStart(2, "0"),
      String(Math.floor((remaining % hourMs) / 1000)).padStart(4, "0"),
      String(remaining % 1000).padStart(3, "0"),
    ],
  };
}
