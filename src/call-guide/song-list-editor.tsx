import { useEffect, useState } from "react";
import { songGuides } from "./song-catalog";
import { SongListRows } from "./song-list-rows";
import type { SongGuideData, SongSummary } from "./song-types";

type CatalogDraft = {
  sourceKey: string;
  songs: SongGuideData[];
};

type EditableSongField = "slug" | "title" | "reading" | "guide" | "summary" | "videoId";

const SOURCE_KEY = songGuides
  .map((song) => `${song.slug}:${song.revision}`)
  .join("|");
const STORAGE_KEY = `sukima-song-catalog-${SOURCE_KEY}`;

function cloneSongs() {
  return songGuides.map((song) => ({ ...song }));
}

function makeDefaultDraft(): CatalogDraft {
  return { sourceKey: SOURCE_KEY, songs: cloneSongs() };
}

function isSongGuideData(value: unknown): value is SongGuideData {
  if (!value || typeof value !== "object") return false;
  const song = value as Partial<SongGuideData>;
  return (
    typeof song.revision === "number" &&
    typeof song.slug === "string" &&
    typeof song.order === "number" &&
    typeof song.title === "string" &&
    typeof song.reading === "string" &&
    typeof song.guide === "string" &&
    typeof song.summary === "string" &&
    typeof song.videoId === "string" &&
    Array.isArray(song.lyrics) &&
    Array.isArray(song.cues)
  );
}

function normalizeDraft(value: unknown): CatalogDraft {
  const fallback = makeDefaultDraft();
  if (!value || typeof value !== "object") return fallback;

  const candidate = value as Partial<CatalogDraft>;
  if (candidate.sourceKey !== SOURCE_KEY || !Array.isArray(candidate.songs)) {
    return fallback;
  }

  return {
    sourceKey: SOURCE_KEY,
    songs: candidate.songs.filter(isSongGuideData),
  };
}

function toSummary(song: SongGuideData): SongSummary {
  return {
    revision: song.revision,
    slug: song.slug,
    order: song.order,
    title: song.title,
    reading: song.reading,
    guide: song.guide,
    ready: Boolean(song.videoId && song.lyrics.length > 0),
  };
}

function makeFilePayload(song: SongGuideData) {
  return { ...song, revision: song.revision + 1 };
}

export default function SongListEditor() {
  const [draft, setDraft] = useState<CatalogDraft>(makeDefaultDraft);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setDraft(normalizeDraft(JSON.parse(saved)));
      } catch {
        setDraft(makeDefaultDraft());
      } finally {
        setHydrated(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  const updateSong = (index: number, field: EditableSongField, value: string) => {
    const nextValue =
      field === "slug"
        ? value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
        : value;

    setDraft((previous) => ({
      ...previous,
      songs: previous.songs.map((song, songIndex) =>
        songIndex === index ? { ...song, [field]: nextValue } : song,
      ),
    }));
    setStatus("");
  };

  const moveSong = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.songs.length) return;

    setDraft((previous) => {
      const songs = [...previous.songs];
      [songs[index], songs[targetIndex]] = [songs[targetIndex], songs[index]];
      return {
        ...previous,
        songs: songs.map((song, songIndex) => ({ ...song, order: songIndex + 1 })),
      };
    });
    setStatus("");
  };

  const removeSong = (index: number) => {
    setDraft((previous) => ({
      ...previous,
      songs: previous.songs
        .filter((_, songIndex) => songIndex !== index)
        .map((song, songIndex) => ({ ...song, order: songIndex + 1 })),
    }));
    setStatus("");
  };

  const addSong = () => {
    const suffix = Date.now().toString().slice(-6);
    const song: SongGuideData = {
      revision: 0,
      slug: `new-song-${suffix}`,
      order: draft.songs.length + 1,
      title: "새 노래",
      reading: "NEW SONG",
      guide: "가이드 미정",
      summary: "가사와 콜 타이밍을 준비하고 있습니다.",
      videoId: "",
      lyrics: [],
      cues: [],
    };

    setDraft((previous) => ({ ...previous, songs: [...previous.songs, song] }));
    setStatus("새 노래를 추가했습니다. 내용을 작성한 뒤 이 곡 JSON을 복사하세요.");
  };

  const copySong = async (song: SongGuideData) => {
    if (!song.slug) {
      setStatus("페이지 주소 ID를 먼저 입력해 주세요.");
      return;
    }
    if (draft.songs.filter((item) => item.slug === song.slug).length > 1) {
      setStatus("같은 페이지 주소 ID가 두 개 있습니다. 서로 다르게 지정해 주세요.");
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(makeFilePayload(song), null, 2));
      setStatus(`${song.slug}.json 내용을 복사했습니다.`);
    } catch {
      setStatus("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  };

  const copyAllSongs = async () => {
    try {
      const payload = draft.songs.map(makeFilePayload);
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatus("전체 노래 JSON 묶음을 복사했습니다.");
    } catch {
      setStatus("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  };

  const resetSongs = () => {
    if (!window.confirm("이 기기에 임시 저장한 목록 수정을 초기화할까요?")) return;
    setDraft(makeDefaultDraft());
    setStatus("파일에 저장된 노래 목록으로 되돌렸습니다.");
  };

  return (
    <>
      <section className="song-list-dev-banner" aria-label="곡 목록 개발자 편집 모드">
        <span>LOCAL DEVELOPMENT TOOL</span>
        <strong>SONG CATALOG EDITOR</strong>
        <p>곡별 JSON을 저장하면 목록과 상세 페이지가 함께 만들어집니다.</p>
      </section>

      <SongListRows editLinks songs={draft.songs.map(toSummary)} />

      <section className="song-list-editor">
        <div className="song-list-editor-heading">
          <div>
            <span>SONG FILES</span>
            <strong>{draft.songs.length} SONGS</strong>
          </div>
          <button onClick={addSong} type="button">+ 노래 추가</button>
        </div>

        <ol className="song-edit-list">
          {draft.songs.map((song, index) => (
            <li className="song-edit-card" key={`${index}-${song.revision}`}>
              <div className="song-edit-card-topline">
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <code>{song.slug || "페이지 주소 ID 필요"}.json</code>
                <div className="song-order-buttons">
                  <button disabled={index === 0} onClick={() => moveSong(index, -1)} type="button" aria-label={`${song.title} 위로 이동`}>↑</button>
                  <button disabled={index === draft.songs.length - 1} onClick={() => moveSong(index, 1)} type="button" aria-label={`${song.title} 아래로 이동`}>↓</button>
                  <button className="song-remove-button" onClick={() => removeSong(index)} type="button">삭제</button>
                </div>
              </div>

              <div className="song-edit-fields">
                <label>
                  <span>곡명</span>
                  <input value={song.title} onChange={(event) => updateSong(index, "title", event.target.value)} />
                </label>
                <label>
                  <span>영문 표기</span>
                  <input value={song.reading} onChange={(event) => updateSong(index, "reading", event.target.value)} />
                </label>
                <label>
                  <span>가이드 유형</span>
                  <input value={song.guide} onChange={(event) => updateSong(index, "guide", event.target.value)} />
                </label>
                <label>
                  <span>페이지 주소 ID</span>
                  <input value={song.slug} onChange={(event) => updateSong(index, "slug", event.target.value)} />
                </label>
                <label className="song-edit-field-wide">
                  <span>상세 페이지 안내</span>
                  <input value={song.summary} onChange={(event) => updateSong(index, "summary", event.target.value)} />
                </label>
                <label className="song-edit-field-wide">
                  <span>YouTube 영상 ID · 비워두면 준비 중 페이지</span>
                  <input value={song.videoId} onChange={(event) => updateSong(index, "videoId", event.target.value)} />
                </label>
              </div>

              <button className="song-json-copy-button" onClick={() => copySong(song)} type="button">
                {song.slug || "이 곡"}.json 복사
              </button>
            </li>
          ))}
        </ol>

        <footer className="song-list-editor-footer">
          <span role="status">{status}</span>
          <div>
            <button onClick={resetSongs} type="button">작업 초기화</button>
            <button className="song-list-export-button" onClick={copyAllSongs} type="button">전체 JSON 묶음 복사</button>
          </div>
        </footer>
      </section>
    </>
  );
}
