export const wonderlivetStart = "2026-11-22T20:00:00+09:00";
export const wonderlivetTimeLabel = wonderlivetStart.slice(11, 16);

const startMs = Date.parse(wonderlivetStart);
const dayMs = 24 * 60 * 60 * 1000;
const showMidnight = Date.parse(`${wonderlivetStart.slice(0, 10)}T00:00:00+09:00`);
export const afterShowDay = showMidnight + dayMs;

export function getNextShowCountdown(now: number) {
  if (now >= afterShowDay) return { dayLabel: "CLOSED", remaining: "일정 종료" };
  if (now >= startMs) return { dayLabel: "D-DAY", remaining: "공연 시작" };

  const calendarDays = Math.ceil((showMidnight - now) / dayMs);
  const secondsLeft = Math.ceil((startMs - now) / 1000);
  const clock = [
    Math.floor(secondsLeft / 3600),
    Math.floor(secondsLeft / 60) % 60,
    secondsLeft % 60,
  ].map(value => String(value).padStart(2, "0")).join(":");

  return { dayLabel: calendarDays > 0 ? `D-${calendarDays}` : "D-DAY", remaining: clock };
}
