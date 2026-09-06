import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { CONTENT_TOOLS_ENABLED } from "./content-tools";
import type {
  GuideCue,
  GuideKind,
  LyricLine,
  LyricToken,
  PublishedLineSync,
  PublishedSongSync,
  SongGuideData,
} from "./song-types";

type YouTubePlayerInstance = {
  destroy: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
};

type YouTubeAPI = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, number | string>;
      events: { onReady: () => void };
    },
  ) => YouTubePlayerInstance;
};

declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type SyncUnit = {
  text: string;
  call: boolean;
  syncIndex: number | null;
};

type LineTimingDraft = {
  id: string;
  syllableTimes: number[];
  syllableCaptured: boolean[];
};

type InterludeDraft = {
  id: string;
  label: string;
  start: number;
  end: number;
};

type SyncDraft = {
  version: 4;
  lines: LineTimingDraft[];
  cues: GuideCue[];
  interludes: InterludeDraft[];
};

type ResolvedCue = GuideCue & {
  start: number;
  end: number;
};

const FINAL_LINE_HOLD_SECONDS = 1.2;
const MAX_FINAL_SYLLABLE_SECONDS = 0.8;

const cueMeta: Record<
  GuideKind | "listen",
  { code: string; title: string; detail: string }
> = {
  listen: {
    code: "LISTEN",
    title: "듣는 구간",
    detail: "관객 참여 없이 노래를 들어요.",
  },
  sing: {
    code: "TOGETHER",
    title: "같이 부르기",
    detail: "굵게 표시된 가사를 함께 불러요.",
  },
  response: {
    code: "RESPONSE",
    title: "콜 · 대답",
    detail: "가수의 선창 다음에 관객이 받아쳐요.",
  },
  action: {
    code: "ACTION",
    title: "동작",
    detail: "박수, 손동작, 점프 등의 안내를 따라 해요.",
  },
  cheer: {
    code: "CHEER",
    title: "호응",
    detail: "짧은 구호나 함성으로 호응해요.",
  },
};

let apiPromise: Promise<YouTubeAPI> | null = null;

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeAPI>((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

function isSyncableCharacter(character: string) {
  return /[가-힣A-Za-z0-9]/u.test(character);
}

function buildSyncUnits(tokens: LyricToken[]) {
  let syncIndex = 0;

  return tokens.flatMap((token) =>
    Array.from(token.text).map<SyncUnit>((character) => {
      if (!isSyncableCharacter(character)) {
        return { text: character, call: Boolean(token.call), syncIndex: null };
      }

      const unit = {
        text: character,
        call: Boolean(token.call),
        syncIndex,
      };
      syncIndex += 1;
      return unit;
    }),
  );
}

function seedSyllableTimes(line: LyricLine) {
  const count = buildSyncUnits(line.pronunciation).filter(
    (unit) => unit.syncIndex !== null,
  ).length;
  const duration = Math.max(0.5, line.end - line.start);

  return Array.from({ length: count }, (_, index) =>
    Number((line.start + (duration * index) / Math.max(1, count)).toFixed(3)),
  );
}

function makeDefaultLineDraft(
  line: LyricLine,
  publishedLineMap: Map<string, PublishedLineSync>,
): LineTimingDraft {
  const published = publishedLineMap.get(line.id);
  const syllableTimes = seedSyllableTimes(line);

  if (published && published.syllablesMs.length === syllableTimes.length) {
    const importedSyllableTimes = published.syllablesMs.map((time) => time / 1000);

    return {
      id: line.id,
      syllableTimes: importedSyllableTimes,
      syllableCaptured: importedSyllableTimes.map(() => true),
    };
  }

  return {
    id: line.id,
    syllableTimes,
    syllableCaptured: syllableTimes.map(() => false),
  };
}

function makeDefaultDraft(
  song: SongGuideData,
  publishedSyncData: PublishedSongSync | undefined,
): SyncDraft {
  const publishedLineMap = new Map<string, PublishedLineSync>(
    publishedSyncData?.lines.map((line) => [line.id, line] as const) ?? [],
  );
  const publishedCues = publishedSyncData?.cues.map(
    ({ startMs, endMs, ...cue }) => ({
      ...cue,
      start: typeof startMs === "number" ? startMs / 1000 : undefined,
      end: typeof endMs === "number" ? endMs / 1000 : undefined,
    }),
  );

  return {
    version: 4,
    lines: song.lyrics.map((line) => makeDefaultLineDraft(line, publishedLineMap)),
    cues: publishedCues ?? song.cues,
    interludes:
      publishedSyncData?.interludes?.map((interlude) => ({
        id: interlude.id,
        label: interlude.label,
        start: interlude.startMs / 1000,
        end: interlude.endMs / 1000,
      })) ?? [],
  };
}

function normalizeDraft(
  value: unknown,
  song: SongGuideData,
  publishedSyncData: PublishedSongSync | undefined,
): SyncDraft {
  const fallback = makeDefaultDraft(song, publishedSyncData);
  if (!value || typeof value !== "object") return fallback;

  const candidate = value as Partial<SyncDraft>;
  if (candidate.version !== 4 || !Array.isArray(candidate.lines)) return fallback;

  const savedLines = new Map(candidate.lines.map((line) => [line.id, line]));
  const publishedLineMap = new Map<string, PublishedLineSync>(
    publishedSyncData?.lines.map((line) => [line.id, line] as const) ?? [],
  );
  const lines = song.lyrics.map((baseLine) => {
    const baseDraft = makeDefaultLineDraft(baseLine, publishedLineMap);
    const saved = savedLines.get(baseLine.id);
    if (!saved || saved.syllableTimes.length !== baseDraft.syllableTimes.length) {
      return baseDraft;
    }

    return {
      ...baseDraft,
      ...saved,
      syllableCaptured:
        saved.syllableCaptured.length === saved.syllableTimes.length
          ? saved.syllableCaptured
          : saved.syllableTimes.map(() => false),
    };
  });

  return {
    version: 4,
    lines,
    cues: Array.isArray(candidate.cues) ? candidate.cues : fallback.cues,
    interludes: Array.isArray(candidate.interludes)
      ? candidate.interludes
      : fallback.interludes,
  };
}

function resolveLines(songLyrics: LyricLine[], lines: LineTimingDraft[]) {
  return songLyrics.map((line, index) => {
    const timing = lines[index];
    const start = timing?.syllableTimes[0] ?? line.start;
    const lastSyllable = timing?.syllableTimes.at(-1) ?? line.end;
    const nextStart = lines[index + 1]?.syllableTimes[0];
    const end =
      typeof nextStart === "number" && nextStart > start
        ? nextStart
        : Math.max(start + 0.2, lastSyllable + FINAL_LINE_HOLD_SECONDS);

    return { ...line, start, end };
  });
}

function resolveCues(
  cues: GuideCue[],
  lines: Array<LyricLine & { start: number; end: number }>,
) {
  const lineMap = new Map(lines.map((line) => [line.id, line]));

  return cues.flatMap<ResolvedCue>((cue) => {
    if (cue.anchorLineId) {
      const line = lineMap.get(cue.anchorLineId);
      return line ? [{ ...cue, start: line.start, end: line.end }] : [];
    }

    if (typeof cue.start !== "number" || typeof cue.end !== "number") return [];
    return [{ ...cue, start: cue.start, end: cue.end }];
  });
}

function formatTime(value: number, precise = false) {
  const safeValue = Math.max(0, value);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  const fraction = precise
    ? `.${String(Math.floor((safeValue % 1) * 1000)).padStart(3, "0")}`
    : "";
  return `${minutes}:${String(seconds).padStart(2, "0")}${fraction}`;
}

function Layer({ className, tokens }: { className: string; tokens: LyricToken[] }) {
  return (
    <p className={className}>
      {tokens.map((token, index) => (
        <span className={token.call ? "call-token" : undefined} key={`${token.text}-${index}`}>
          {token.text}
        </span>
      ))}
    </p>
  );
}

function KaraokePronunciation({
  line,
  timing,
  currentTime,
}: {
  line: LyricLine;
  timing: LineTimingDraft;
  currentTime: number;
}) {
  const units = buildSyncUnits(line.pronunciation);

  return (
    <p className="lyric-pronunciation karaoke-pronunciation">
      {units.map((unit, index) => {
        if (unit.syncIndex === null) {
          return (
            <span className={unit.call ? "call-token" : undefined} key={`${unit.text}-${index}`}>
              {unit.text}
            </span>
          );
        }

        const startedAt = timing.syllableTimes[unit.syncIndex] ?? line.start;
        const previousAt = timing.syllableTimes[unit.syncIndex - 1];
        const inferredFinalDuration = Math.min(
          MAX_FINAL_SYLLABLE_SECONDS,
          Math.max(0.12, previousAt ? startedAt - previousAt : 0.45),
        );
        const nextAt =
          timing.syllableTimes[unit.syncIndex + 1] ?? startedAt + inferredFinalDuration;
        const progress = Math.min(
          1,
          Math.max(0, (currentTime - startedAt) / Math.max(0.08, nextAt - startedAt)),
        );
        const style = {
          "--syllable-fill": `${Math.round(progress * 100)}%`,
        } as CSSProperties;

        return (
          <span
            className={`karaoke-syllable${unit.call ? " call-token" : ""}`}
            key={`${unit.text}-${index}`}
            style={style}
          >
            {unit.text}
          </span>
        );
      })}
    </p>
  );
}

function TimelineTriplet({ line }: { line: LyricLine }) {
  return (
    <>
      <Layer className="lyric-original" tokens={line.original} />
      <Layer className="lyric-pronunciation" tokens={line.pronunciation} />
      <Layer className="lyric-translation" tokens={line.translation} />
    </>
  );
}

export function SongGuidePlayer({
  song,
  publishedSyncData,
}: {
  song: SongGuideData;
  publishedSyncData?: PublishedSongSync;
}) {
  const [searchParams] = useSearchParams();
  const songLyrics = song.lyrics;
  const videoId = song.videoId;
  const storageKey = `sukima-sync-${song.slug}-r${publishedSyncData?.revision ?? 0}`;
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<SyncDraft>(() =>
    makeDefaultDraft(song, publishedSyncData),
  );
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [selectedSyllableIndex, setSelectedSyllableIndex] = useState(0);
  const [syncComplete, setSyncComplete] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.75);
  const [copyStatus, setCopyStatus] = useState("");
  const [cueKind, setCueKind] = useState<GuideKind>("action");
  const [cueTitle, setCueTitle] = useState("박수");
  const [cueDetail, setCueDetail] = useState("리듬에 맞춰 박수");
  const [cueStart, setCueStart] = useState(0);
  const [cueEnd, setCueEnd] = useState(0);
  const [interludeLabel, setInterludeLabel] = useState("간주");
  const [interludeStart, setInterludeStart] = useState(0);
  const [interludeEnd, setInterludeEnd] = useState(0);
  const syncMode =
    CONTENT_TOOLS_ENABLED && searchParams.get("sync") === "1";

  const resolvedLines = useMemo(
    () => resolveLines(songLyrics, draft.lines),
    [draft.lines, songLyrics],
  );
  const resolvedCues = useMemo(
    () => resolveCues(draft.cues, resolvedLines),
    [draft.cues, resolvedLines],
  );
  const activeInterlude = draft.interludes.find(
    (interlude) => currentTime >= interlude.start && currentTime < interlude.end,
  );

  const lyricActiveIndex = useMemo(
    () =>
      resolvedLines.findIndex(
        (line) => currentTime >= line.start && currentTime < line.end,
      ),
    [currentTime, resolvedLines],
  );
  const activeIndex = activeInterlude ? -1 : lyricActiveIndex;
  const activeLine = activeIndex >= 0 ? songLyrics[activeIndex] : null;
  const activeTiming = activeIndex >= 0 ? draft.lines[activeIndex] : null;
  const activeCues = useMemo(
    () => resolvedCues.filter((cue) => currentTime >= cue.start && currentTime < cue.end),
    [currentTime, resolvedCues],
  );
  const primaryCue = activeCues[0];
  const displayCue = primaryCue ?? {
    kind: "listen" as const,
    ...cueMeta.listen,
  };
  const selectedLine = songLyrics[selectedLineIndex];
  const selectedTiming = draft.lines[selectedLineIndex];
  const selectedUnits = useMemo(
    () => buildSyncUnits(selectedLine.pronunciation),
    [selectedLine],
  );
  const selectedSyncUnits = useMemo(
    () => selectedUnits.filter((unit) => unit.syncIndex !== null),
    [selectedUnits],
  );
  const selectedAnchoredCue = draft.cues.find(
    (cue) => cue.anchorLineId === selectedLine.id,
  );
  const customCues = draft.cues.filter((cue) => !cue.anchorLineId);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          setDraft(normalizeDraft(JSON.parse(saved), song, publishedSyncData));
        }
      } catch {
        setDraft(makeDefaultDraft(song, publishedSyncData));
      } finally {
        setHydrated(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [publishedSyncData, song, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, hydrated, storageKey]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    loadYouTubeAPI().then((YT) => {
      if (cancelled || !playerHostRef.current) return;

      playerRef.current = new YT.Player(playerHostRef.current, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            playerRef.current?.setPlaybackRate(
              syncMode ? playbackRate : 1,
            );
            timer = setInterval(() => {
              const time = playerRef.current?.getCurrentTime();
              if (typeof time === "number") setCurrentTime(time);
            }, 50);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // The initial rate is applied when the player becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const container = timelineRef.current;
    const target = lineRefs.current[activeIndex];
    if (!container || !target) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({
      top: Math.max(0, target.offsetTop - container.clientHeight * 0.34),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex]);

  const getExactPlayerTime = useCallback(
    () => playerRef.current?.getCurrentTime() ?? currentTime,
    [currentTime],
  );

  const updateLineTiming = useCallback(
    (lineIndex: number, updater: (line: LineTimingDraft) => LineTimingDraft) => {
      setDraft((previous) => ({
        ...previous,
        lines: previous.lines.map((line, index) =>
          index === lineIndex ? updater(line) : line,
        ),
      }));
    },
    [],
  );

  const selectLine = useCallback((lineIndex: number) => {
    setSelectedLineIndex(lineIndex);
    setSelectedSyllableIndex(0);
    setSyncComplete(false);
  }, []);

  const seekTo = useCallback((seconds: number, shouldPlay = true) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(Math.max(0, seconds), true);
    if (shouldPlay) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
    setCurrentTime(Math.max(0, seconds));
  }, []);

  const markSelectedSyllable = useCallback(() => {
    const time = getExactPlayerTime();
    updateLineTiming(selectedLineIndex, (line) => {
      const isFirstCapture =
        selectedSyllableIndex === 0 && !line.syllableCaptured[0];
      const delta = isFirstCapture ? time - line.syllableTimes[0] : 0;

      return {
        ...line,
        syllableTimes: line.syllableTimes.map((value, index) => {
          if (index === selectedSyllableIndex) return time;
          return isFirstCapture && !line.syllableCaptured[index] ? value + delta : value;
        }),
        syllableCaptured: line.syllableCaptured.map((value, index) =>
          index === selectedSyllableIndex ? true : value,
        ),
      };
    });

    if (selectedSyllableIndex < selectedSyncUnits.length - 1) {
      setSyncComplete(false);
      setSelectedSyllableIndex((index) => index + 1);
    } else if (selectedLineIndex < songLyrics.length - 1) {
      setSyncComplete(false);
      setSelectedLineIndex((index) => index + 1);
      setSelectedSyllableIndex(0);
    } else {
      setSyncComplete(true);
      setCopyStatus("모든 음절 입력이 끝났습니다. SYNC JSON을 복사해 주세요.");
    }
  }, [
    getExactPlayerTime,
    selectedLineIndex,
    selectedSyllableIndex,
    selectedSyncUnits.length,
    songLyrics.length,
    updateLineTiming,
  ]);

  const nudgeSelectedSyllable = useCallback(
    (delta: number) => {
      setSyncComplete(false);
      updateLineTiming(selectedLineIndex, (line) => {
        const previousTime =
          selectedSyllableIndex > 0
            ? line.syllableTimes[selectedSyllableIndex - 1] + 0.01
            : 0;
        const nextTime =
          selectedSyllableIndex < line.syllableTimes.length - 1
            ? line.syllableTimes[selectedSyllableIndex + 1] - 0.01
            : Number.POSITIVE_INFINITY;
        const current =
          line.syllableTimes[selectedSyllableIndex] ?? selectedLine.start;
        const nextValue = Math.min(nextTime, Math.max(previousTime, current + delta));
        return {
          ...line,
          syllableTimes: line.syllableTimes.map((value, index) =>
            index === selectedSyllableIndex ? nextValue : value,
          ),
          syllableCaptured: line.syllableCaptured.map((value, index) =>
            index === selectedSyllableIndex ? true : value,
          ),
        };
      });
    },
    [selectedLine.start, selectedLineIndex, selectedSyllableIndex, updateLineTiming],
  );

  useEffect(() => {
    if (!syncMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button")) return;
      if (event.repeat) return;

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        markSelectedSyllable();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markSelectedSyllable, syncMode]);

  const setRate = (rate: number) => {
    setPlaybackRate(rate);
    playerRef.current?.setPlaybackRate(rate);
  };

  const setSelectedLineCue = (value: "none" | GuideKind) => {
    setDraft((previous) => {
      const withoutSelected = previous.cues.filter(
        (cue) => cue.anchorLineId !== selectedLine.id,
      );
      if (value === "none") return { ...previous, cues: withoutSelected };

      const existing = previous.cues.find(
        (cue) => cue.anchorLineId === selectedLine.id,
      );
      const meta = cueMeta[value];
      return {
        ...previous,
        cues: [
          ...withoutSelected,
          {
            id: existing?.id ?? `cue-${selectedLine.id}`,
            anchorLineId: selectedLine.id,
            kind: value,
            title: existing?.title ?? meta.title,
            detail: existing?.detail ?? meta.detail,
          },
        ],
      };
    });
  };

  const updateSelectedCueDetail = (detail: string) => {
    setDraft((previous) => ({
      ...previous,
      cues: previous.cues.map((cue) =>
        cue.anchorLineId === selectedLine.id ? { ...cue, detail } : cue,
      ),
    }));
  };

  const addCustomCue = () => {
    if (cueEnd <= cueStart) {
      setCopyStatus("종료 시간을 시작 시간보다 뒤로 찍어 주세요.");
      return;
    }

    const meta = cueMeta[cueKind];
    setDraft((previous) => ({
      ...previous,
      cues: [
        ...previous.cues,
        {
          id: `custom-${Date.now()}`,
          kind: cueKind,
          title: cueTitle.trim() || meta.title,
          detail: cueDetail.trim() || meta.detail,
          start: cueStart,
          end: cueEnd,
        },
      ],
    }));
    setCopyStatus("독립 큐를 추가했습니다.");
  };

  const removeCue = (cueId: string) => {
    setDraft((previous) => ({
      ...previous,
      cues: previous.cues.filter((cue) => cue.id !== cueId),
    }));
  };

  const addInterlude = () => {
    if (interludeEnd <= interludeStart) {
      setCopyStatus("간주 종료 시간을 시작 시간보다 뒤로 찍어 주세요.");
      return;
    }
    if (
      draft.interludes.some(
        (interlude) =>
          interludeStart < interlude.end && interludeEnd > interlude.start,
      )
    ) {
      setCopyStatus("이미 등록된 간주 구간과 시간이 겹칩니다.");
      return;
    }

    setDraft((previous) => ({
      ...previous,
      interludes: [
        ...previous.interludes,
        {
          id: `interlude-${Date.now()}`,
          label: interludeLabel.trim() || "간주",
          start: interludeStart,
          end: interludeEnd,
        },
      ].sort((left, right) => left.start - right.start),
    }));
    setCopyStatus("간주 구간을 추가했습니다.");
  };

  const removeInterlude = (interludeId: string) => {
    setDraft((previous) => ({
      ...previous,
      interludes: previous.interludes.filter(
        (interlude) => interlude.id !== interludeId,
      ),
    }));
  };

  const exportSyncData = async () => {
    const payload = {
      revision: (publishedSyncData?.revision ?? 0) + 1,
      videoId,
      lines: draft.lines.map((line) => ({
        id: line.id,
        syllablesMs: line.syllableTimes.map((time) => Math.round(time * 1000)),
      })),
      cues: draft.cues.map((cue) => ({
        ...cue,
        startMs: typeof cue.start === "number" ? Math.round(cue.start * 1000) : undefined,
        endMs: typeof cue.end === "number" ? Math.round(cue.end * 1000) : undefined,
        start: undefined,
        end: undefined,
      })),
      interludes: draft.interludes.map((interlude) => ({
        id: interlude.id,
        label: interlude.label,
        startMs: Math.round(interlude.start * 1000),
        endMs: Math.round(interlude.end * 1000),
      })),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus("싱크 JSON을 클립보드에 복사했습니다.");
    } catch {
      setCopyStatus("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  };

  const resetSyncData = () => {
    if (!window.confirm("현재 기기에 저장한 싱크 작업을 모두 초기화할까요?")) return;
    const nextDraft = makeDefaultDraft(song, publishedSyncData);
    setDraft(nextDraft);
    setSelectedLineIndex(0);
    setSelectedSyllableIndex(0);
    setSyncComplete(false);
    setCopyStatus("파일에 저장된 싱크로 되돌렸습니다.");
  };

  return (
    <>
      <section className="karaoke-shell" aria-label={`${song.title} 영상과 가사`}>
        <div className="video-column">
          <div className="video-frame" aria-label={`${song.title} 유튜브 영상`}>
            <div ref={playerHostRef} />
          </div>

          <div className={`participation-strip cue-${displayCue.kind}`}>
            <span className="participation-code">
              {primaryCue ? cueMeta[primaryCue.kind].code : cueMeta.listen.code}
            </span>
            <span className="participation-copy">
              <strong>{primaryCue?.title ?? cueMeta.listen.title}</strong>
              <small>{primaryCue?.detail ?? cueMeta.listen.detail}</small>
            </span>
            <span className="participation-symbol" aria-hidden="true">
              {displayCue.kind === "sing"
                ? "01"
                : displayCue.kind === "response"
                  ? "A→B"
                  : displayCue.kind === "action"
                    ? "MOVE"
                    : displayCue.kind === "cheer"
                      ? "VOICE"
                      : "—"}
            </span>
          </div>

          <div className={`lyric-stage cue-${displayCue.kind}`}>
            <div className="lyric-stage-meta">
              <span>
                {activeInterlude
                  ? "INTERLUDE"
                  : activeLine
                    ? `LINE ${String(activeIndex + 1).padStart(2, "0")}`
                    : "WAITING"}
              </span>
              <time>{formatTime(currentTime)}</time>
            </div>
            <div className="lyric-stage-copy" aria-live="polite">
              {activeInterlude ? (
                <div className="lyric-waiting is-interlude">
                  <strong>{activeInterlude.label}</strong>
                  <span>간주 중</span>
                </div>
              ) : activeLine && activeTiming ? (
                <div className="active-lyric-triplet" key={activeLine.id}>
                  <Layer className="lyric-original" tokens={activeLine.original} />
                  <KaraokePronunciation
                    currentTime={currentTime}
                    line={activeLine}
                    timing={activeTiming}
                  />
                  <Layer className="lyric-translation" tokens={activeLine.translation} />
                </div>
              ) : (
                <div className="lyric-waiting">
                  <strong>
                    {currentTime < (resolvedLines[0]?.start ?? 0)
                      ? "재생하면 가사가 시작됩니다."
                      : "가사가 끝났습니다."}
                  </strong>
                  <span>
                    {currentTime < (resolvedLines[0]?.start ?? 0)
                      ? "첫 소절을 기다려 주세요."
                      : "명시된 간주 구간이 아닙니다."}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="lyric-legend" aria-label="가사와 관객 큐 안내">
            <span><i className="legend-original" />원문</span>
            <span><i className="legend-pronunciation" />발음 · 진행</span>
            <span><i className="legend-translation" />번역</span>
            <span><b className="legend-cue" />관객 참여</span>
          </div>
        </div>

        <div className="timeline-column">
          <div className="timeline-heading">
            <div>
              <span>FULL LYRICS</span>
              <strong>소절을 누르면 바로 이동</strong>
            </div>
            <span className={`sync-status${ready ? " is-ready" : ""}`}>
              {ready ? "SYNC ON" : "PLAYER LOADING"}
            </span>
          </div>

          <div className="lyrics-timeline" ref={timelineRef}>
            {songLyrics.map((line, index) => {
              const timing = resolvedLines[index];
              const lineCue = draft.cues.find((cue) => cue.anchorLineId === line.id);
              return (
                <button
                  className={`timeline-line${index === activeIndex ? " is-active" : ""}${
                    lineCue ? ` has-cue cue-${lineCue.kind}` : ""
                  }${line.breakBefore ? " has-break" : ""}`}
                  key={line.id}
                  onClick={() => {
                    seekTo(timing.start);
                    if (syncMode) selectLine(index);
                  }}
                  ref={(node) => {
                    lineRefs.current[index] = node;
                  }}
                  type="button"
                  aria-current={index === activeIndex ? "true" : undefined}
                  aria-label={`${formatTime(timing.start)} 소절로 이동`}
                >
                  <time>{formatTime(timing.start)}</time>
                  <span className="timeline-copy">
                    {lineCue && (
                      <span className="timeline-cue-badge">
                        {cueMeta[lineCue.kind].code} · {lineCue.title}
                      </span>
                    )}
                    <TimelineTriplet line={line} />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="sync-note">
            발음 줄은 음절 타이밍에 맞춰 차오릅니다 · 세부 싱크는 계속 보정 예정
          </p>
        </div>
      </section>

      {CONTENT_TOOLS_ENABLED && syncMode && (
        <section className="sync-studio" aria-labelledby="sync-studio-title">
          <header className="sync-studio-header">
            <div>
              <span>LOCAL DEVELOPMENT TOOL</span>
              <h2 id="sync-studio-title">SYNC STUDIO</h2>
              <p>이 기기에 자동 저장됩니다. 배포 데이터로 쓰려면 마지막에 JSON을 복사하세요.</p>
            </div>
            <strong className="sync-clock">{formatTime(currentTime, true)}</strong>
          </header>

          <div className="sync-studio-grid">
            <div className="sync-editor-panel">
              <div className="sync-section-heading">
                <span>01 · LYRIC</span>
                <strong>음절 타이밍</strong>
              </div>

              <label className="sync-field">
                <span>작업할 소절</span>
                <select
                  onChange={(event) => selectLine(Number(event.target.value))}
                  value={selectedLineIndex}
                >
                  {songLyrics.map((line, index) => (
                    <option key={line.id} value={index}>
                      {String(index + 1).padStart(2, "0")} · {line.pronunciation.map((token) => token.text).join("")}
                    </option>
                  ))}
                </select>
              </label>

              <div className="line-time-controls">
                <button onClick={() => seekTo((selectedTiming.syllableTimes[0] ?? selectedLine.start) - 1.5)} type="button">
                  이 줄 1.5초 전 재생
                </button>
              </div>

              <div className="syllable-editor" aria-label="음절별 타이밍 편집">
                {selectedUnits.map((unit, unitIndex) => {
                  if (unit.syncIndex === null) {
                    return <span className="syllable-separator" key={`${unit.text}-${unitIndex}`}>{unit.text}</span>;
                  }

                  const captured = selectedTiming.syllableCaptured[unit.syncIndex];
                  return (
                    <button
                      className={`syllable-key${unit.syncIndex === selectedSyllableIndex ? " is-selected" : ""}${
                        captured ? " is-captured" : ""
                      }${unit.call ? " is-call" : ""}`}
                      key={`${unit.text}-${unitIndex}`}
                      onClick={() => {
                        setSelectedSyllableIndex(unit.syncIndex as number);
                        setSyncComplete(false);
                      }}
                      title={formatTime(selectedTiming.syllableTimes[unit.syncIndex], true)}
                      type="button"
                    >
                      {unit.text}
                    </button>
                  );
                })}
              </div>

              <div className="syllable-status">
                <span>
                  {syncComplete ? (
                    <strong>전체 음절 입력 완료</strong>
                  ) : (
                    <>선택 음절 <strong>{selectedSyncUnits[selectedSyllableIndex]?.text ?? "-"}</strong></>
                  )}
                </span>
                <span>
                  {selectedTiming.syllableCaptured.filter(Boolean).length}/{selectedTiming.syllableCaptured.length} 기록
                </span>
              </div>

              <button className={`mark-syllable-button${syncComplete ? " is-complete" : ""}`} onClick={markSelectedSyllable} type="button">
                <span>{syncComplete ? "전체 음절 입력 완료" : "현재 시간에 음절 찍기"}</span>
                <kbd>{syncComplete ? "DONE" : "M"}</kbd>
              </button>

              <div className="nudge-controls">
                <button
                  onClick={() => {
                    setSyncComplete(false);
                    setSelectedSyllableIndex((index) => Math.max(0, index - 1));
                  }}
                  type="button"
                >
                  ← 이전 음절
                </button>
                <button onClick={() => nudgeSelectedSyllable(-0.05)} type="button">− 0.05s</button>
                <strong>{formatTime(selectedTiming.syllableTimes[selectedSyllableIndex] ?? selectedLine.start, true)}</strong>
                <button onClick={() => nudgeSelectedSyllable(0.05)} type="button">+ 0.05s</button>
                <button
                  onClick={() =>
                    {
                      setSyncComplete(false);
                      setSelectedSyllableIndex((index) =>
                        Math.min(selectedSyncUnits.length - 1, index + 1),
                      );
                    }
                  }
                  type="button"
                >
                  다음 음절 →
                </button>
              </div>
            </div>

            <div className="sync-editor-panel">
              <div className="sync-section-heading">
                <span>02 · PARTICIPATION</span>
                <strong>관객 큐 구분</strong>
              </div>

              <div className="cue-kind-reference" aria-label="관객 큐 유형">
                {(["sing", "response", "action", "cheer"] as GuideKind[]).map((kind) => (
                  <span className={`cue-reference cue-${kind}`} key={kind}>
                    <b>{cueMeta[kind].code}</b>{cueMeta[kind].title}
                  </span>
                ))}
              </div>

              <label className="sync-field">
                <span>선택 소절의 관객 큐</span>
                <select
                  onChange={(event) => setSelectedLineCue(event.target.value as "none" | GuideKind)}
                  value={selectedAnchoredCue?.kind ?? "none"}
                >
                  <option value="none">없음 · 듣는 구간</option>
                  <option value="sing">같이 부르기</option>
                  <option value="response">콜 · 대답</option>
                  <option value="action">동작</option>
                  <option value="cheer">호응</option>
                </select>
              </label>

              {selectedAnchoredCue && (
                <label className="sync-field">
                  <span>화면 안내</span>
                  <input
                    onChange={(event) => updateSelectedCueDetail(event.target.value)}
                    value={selectedAnchoredCue.detail}
                  />
                </label>
              )}

              <div className="standalone-cue-editor">
                <div className="sync-section-heading compact">
                  <span>TIMED CUE</span>
                  <strong>가사와 독립된 큐 추가</strong>
                </div>
                <div className="cue-form-row">
                  <label className="sync-field">
                    <span>종류</span>
                    <select value={cueKind} onChange={(event) => setCueKind(event.target.value as GuideKind)}>
                      <option value="action">동작</option>
                      <option value="response">콜 · 대답</option>
                      <option value="cheer">호응</option>
                      <option value="sing">같이 부르기</option>
                    </select>
                  </label>
                  <label className="sync-field">
                    <span>짧은 이름</span>
                    <input value={cueTitle} onChange={(event) => setCueTitle(event.target.value)} />
                  </label>
                </div>
                <label className="sync-field">
                  <span>구체적인 안내</span>
                  <input value={cueDetail} onChange={(event) => setCueDetail(event.target.value)} />
                </label>
                <div className="cue-time-row">
                  <button onClick={() => setCueStart(getExactPlayerTime())} type="button">
                    시작 찍기 <b>{formatTime(cueStart, true)}</b>
                  </button>
                  <button onClick={() => setCueEnd(getExactPlayerTime())} type="button">
                    종료 찍기 <b>{formatTime(cueEnd, true)}</b>
                  </button>
                  <button className="add-cue-button" onClick={addCustomCue} type="button">큐 추가</button>
                </div>
                {customCues.length > 0 && (
                  <ul className="custom-cue-list">
                    {customCues.map((cue) => (
                      <li key={cue.id}>
                        <span className={`cue-dot cue-${cue.kind}`} />
                        <strong>{cue.title}</strong>
                        <time>{formatTime(cue.start ?? 0)}–{formatTime(cue.end ?? 0)}</time>
                        <button onClick={() => removeCue(cue.id)} type="button">삭제</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="standalone-cue-editor interlude-editor">
                <div className="sync-section-heading compact">
                  <span>03 · INTERLUDE</span>
                  <strong>간주 구간 직접 지정</strong>
                </div>
                <label className="sync-field">
                  <span>화면에 표시할 이름</span>
                  <input
                    value={interludeLabel}
                    onChange={(event) => setInterludeLabel(event.target.value)}
                  />
                </label>
                <div className="cue-time-row">
                  <button onClick={() => setInterludeStart(getExactPlayerTime())} type="button">
                    간주 시작 <b>{formatTime(interludeStart, true)}</b>
                  </button>
                  <button onClick={() => setInterludeEnd(getExactPlayerTime())} type="button">
                    간주 종료 <b>{formatTime(interludeEnd, true)}</b>
                  </button>
                  <button className="add-cue-button" onClick={addInterlude} type="button">
                    간주 추가
                  </button>
                </div>
                {draft.interludes.length > 0 && (
                  <ul className="custom-cue-list interlude-list">
                    {draft.interludes.map((interlude) => (
                      <li key={interlude.id}>
                        <span className="cue-dot cue-interlude" />
                        <strong>{interlude.label}</strong>
                        <time>{formatTime(interlude.start)}–{formatTime(interlude.end)}</time>
                        <button onClick={() => removeInterlude(interlude.id)} type="button">
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <footer className="sync-studio-footer">
            <div className="transport-controls">
              <button onClick={() => seekTo(getExactPlayerTime() - 1, false)} type="button">− 1초</button>
              <button onClick={() => playerRef.current?.playVideo()} type="button">재생</button>
              <button onClick={() => playerRef.current?.pauseVideo()} type="button">일시정지</button>
              <button onClick={() => seekTo(getExactPlayerTime() + 1, false)} type="button">+ 1초</button>
              <label>
                속도
                <select value={playbackRate} onChange={(event) => setRate(Number(event.target.value))}>
                  <option value={0.5}>0.5×</option>
                  <option value={0.75}>0.75×</option>
                  <option value={1}>1.0×</option>
                </select>
              </label>
            </div>
            <div className="sync-output-controls">
              <span role="status">{copyStatus}</span>
              <button className="reset-sync-button" onClick={resetSyncData} type="button">작업 초기화</button>
              <button className="export-sync-button" onClick={exportSyncData} type="button">SYNC JSON 복사</button>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}
