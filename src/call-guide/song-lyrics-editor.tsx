import { useEffect, useState } from "react";
import type {
  GuideCue,
  LyricLine,
  LyricToken,
  SongGuideData,
} from "./song-types";

type SavedLyricsDraft = {
  revision: number;
  source: string;
  videoInput: string;
};

type ParseResult =
  | { ok: true; lines: LyricLine[] }
  | { ok: false; message: string };

function tokensToText(tokens: LyricToken[]) {
  return tokens
    .map((token) => (token.call ? `**${token.text}**` : token.text))
    .join("");
}

function lyricsToSource(lyrics: LyricLine[]) {
  const output: string[] = [];

  lyrics.forEach((line, index) => {
    if (index > 0 && line.breakBefore) output.push("");
    output.push(tokensToText(line.original));
    output.push(tokensToText(line.pronunciation));
    output.push(tokensToText(line.translation));
  });

  return output.join("\n");
}

function textToTokens(value: string): LyricToken[] {
  const parts = value.split(/(\*\*.+?\*\*)/g).filter(Boolean);
  return parts.map((part) =>
    part.startsWith("**") && part.endsWith("**")
      ? { text: part.slice(2, -2), call: true }
      : { text: part },
  );
}

export function parseLyrics(source: string, previousLyrics: LyricLine[]): ParseResult {
  const normalized = source.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    return { ok: false, message: "가사를 먼저 붙여 넣어 주세요." };
  }

  const blocks = normalized.split(/\n[\t ]*\n+/);
  const lines: LyricLine[] = [];

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const rows = blocks[blockIndex]
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length % 3 !== 0) {
      return {
        ok: false,
        message: `${blockIndex + 1}번째 문단이 ${rows.length}줄입니다. 일본어·한글 발음·한글 뜻의 3줄 단위로 맞춰 주세요.`,
      };
    }

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 3) {
      const lineIndex = lines.length;
      const previous = previousLyrics[lineIndex];
      const start = previous?.start ?? lineIndex * 6;

      lines.push({
        id: previous?.id ?? `line-${String(lineIndex + 1).padStart(2, "0")}`,
        start,
        end: previous?.end ?? start + 5.8,
        breakBefore: blockIndex > 0 && rowIndex === 0 ? true : undefined,
        original: textToTokens(rows[rowIndex]),
        pronunciation: textToTokens(rows[rowIndex + 1]),
        translation: textToTokens(rows[rowIndex + 2]),
      });
    }
  }

  return { ok: true, lines };
}

function lineHasCall(line: LyricLine) {
  return [...line.original, ...line.pronunciation, ...line.translation].some(
    (token) => token.call,
  );
}

export function buildCues(lines: LyricLine[], previousCues: GuideCue[]) {
  const preservedCues = previousCues.filter(
    (cue) => !cue.anchorLineId || cue.kind !== "sing",
  );
  const previousSingCues = new Map(
    previousCues
      .filter((cue) => cue.anchorLineId && cue.kind === "sing")
      .map((cue) => [cue.anchorLineId as string, cue]),
  );
  const singCues = lines.filter(lineHasCall).map((line) =>
    previousSingCues.get(line.id) ?? {
      id: `cue-${line.id}`,
      kind: "sing" as const,
      title: "같이 부르기",
      detail: "굵게 표시된 소절을 함께 부릅니다.",
      anchorLineId: line.id,
    },
  );

  return [...preservedCues, ...singCues];
}

export function extractYouTubeId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? trimmed;
    const queryId = url.searchParams.get("v");
    if (queryId) return queryId;
    const matchedPath = url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/);
    return matchedPath?.[1] ?? trimmed;
  } catch {
    return trimmed;
  }
}

function LyricLayer({ className, tokens }: { className: string; tokens: LyricToken[] }) {
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

export default function SongLyricsEditor({ song }: { song: SongGuideData }) {
  const storageKey = `sukima-lyrics-${song.slug}-r${song.revision}`;
  const [source, setSource] = useState(() => lyricsToSource(song.lyrics));
  const [videoInput, setVideoInput] = useState(song.videoId);
  const [previewLines, setPreviewLines] = useState(song.lyrics);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SavedLyricsDraft>;
          if (parsed.revision === song.revision) {
            if (typeof parsed.source === "string") {
              setSource(parsed.source);
              const result = parseLyrics(parsed.source, song.lyrics);
              if (result.ok) setPreviewLines(result.lines);
            }
            if (typeof parsed.videoInput === "string") setVideoInput(parsed.videoInput);
          }
        }
      } catch {
        setSource(lyricsToSource(song.lyrics));
        setVideoInput(song.videoId);
        setPreviewLines(song.lyrics);
      } finally {
        setHydrated(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [song, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: SavedLyricsDraft = {
      revision: song.revision,
      source,
      videoInput,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [hydrated, song.revision, source, storageKey, videoInput]);

  const convertLyrics = () => {
    const result = parseLyrics(source, song.lyrics);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    setPreviewLines(result.lines);
    setStatus(`${result.lines.length}개 소절로 변환했습니다.`);
  };

  const copySongJson = async () => {
    const result = parseLyrics(source, song.lyrics);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    const payload: SongGuideData = {
      ...song,
      revision: song.revision + 1,
      videoId: extractYouTubeId(videoInput),
      lyrics: result.lines,
      cues: buildCues(result.lines, song.cues),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setPreviewLines(result.lines);
      setStatus(`${song.slug}.json을 복사했습니다. 곡 파일에 덮어쓴 뒤 싱크 모드로 이동하세요.`);
    } catch {
      setStatus("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  };

  return (
    <section className="lyrics-import-studio" aria-labelledby="lyrics-editor-title">
      <header className="lyrics-import-header">
        <div>
          <span>LOCAL DEVELOPMENT TOOL</span>
          <h2 id="lyrics-editor-title">LYRICS EDITOR</h2>
        </div>
        <strong>{previewLines.length} LINES</strong>
      </header>

      <div className="lyrics-import-grid">
        <div className="lyrics-import-form">
          <label>
            <span>YouTube 주소 또는 영상 ID</span>
            <input value={videoInput} onChange={(event) => setVideoInput(event.target.value)} />
          </label>

          <label>
            <span>가사 원문</span>
            <textarea
              placeholder={"日本語の歌詞\n니혼고노 카시\n일본어 가사\n\n**一緒に歌う部分**\n**잇쇼니 우타우 부분**\n**함께 부르는 부분**"}
              spellCheck={false}
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setStatus("");
              }}
            />
          </label>

          <div className="lyrics-format-note">
            <strong>입력 순서</strong>
            <span>일본어 → 한글 발음 → 한글 뜻</span>
            <span>빈 줄은 문단 구분 · <code>**내용**</code>은 함께 부르는 부분</span>
          </div>

          <div className="lyrics-import-actions">
            <button onClick={convertLyrics} type="button">양식 변환 · 미리보기</button>
            <button className="lyrics-json-copy" onClick={copySongJson} type="button">곡 JSON 복사</button>
          </div>
          <p className="lyrics-import-status" role="status">{status}</p>
          <p className="lyrics-next-step">
            JSON 저장 후 <code>/call-guide/{song.slug}?sync=1</code>에서 줄·음절 싱크를 찍습니다.
          </p>
        </div>

        <div className="lyrics-import-preview" aria-label="변환된 가사 미리보기">
          <div className="lyrics-preview-heading">
            <span>PREVIEW</span>
            <strong>{previewLines.length ? `${previewLines.length}개 소절` : "가사를 입력해 주세요"}</strong>
          </div>
          <div className="lyrics-preview-scroll">
            {previewLines.map((line) => (
              <article className={line.breakBefore ? "has-break" : undefined} key={line.id}>
                <LyricLayer className="lyric-original" tokens={line.original} />
                <LyricLayer className="lyric-pronunciation" tokens={line.pronunciation} />
                <LyricLayer className="lyric-translation" tokens={line.translation} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
