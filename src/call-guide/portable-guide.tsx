import { useEffect, useState } from "react";
import { useOffline } from "../offline";
import { OfflineStatus } from "./offline-status";
import { renderGuideImage } from "./guide-image";
import { cueNames, portableLines } from "./portable-data";
import type { LyricToken, PublishedSongSync, SongGuideData } from "./song-types";
import "./portable-guide.css";

function Tokens({ tokens }: { tokens: LyricToken[] }) {
  return <>{tokens.map((token, i) => token.call ? <strong key={i}>{token.text}</strong> : <span key={i}>{token.text}</span>)}</>;
}

export function PortableGuide({ song, sync, children }: { song: SongGuideData; sync?: PublishedSongSync; children: React.ReactNode }) {
  const { online } = useOffline();
  const [textMode, setTextMode] = useState(false);
  const [translation, setTranslation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picture, setPicture] = useState<{ url: string; file: File } | null>(null);
  useEffect(() => () => { if (picture) URL.revokeObjectURL(picture.url); }, [picture]);
  async function generate() {
    setBusy(true); setError("");
    try {
      const blob = await renderGuideImage(song, sync, translation);
      setPicture({ url: URL.createObjectURL(blob), file: new File([blob], `sukima-${song.slug}-call-guide.png`, { type: "image/png" }) });
    } catch { setError("이미지를 만들지 못했습니다. 번역 포함을 해제하거나 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  async function share() {
    if (!picture) return;
    try { await navigator.share({ files: [picture.file], title: `${song.title} 콜가이드` }); }
    catch (reason) { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError("공유하지 못했습니다. PNG 다운로드 또는 이미지 길게 누르기를 이용해 주세요."); }
  }
  const onlyLyrics = textMode || !online || !song.videoId;
  return <>
    <div className="portable-toolbar">
      <div className="guide-view-options" aria-label="보기 방식">
        <button type="button" aria-pressed={!onlyLyrics} disabled={!online || !song.videoId} onClick={() => setTextMode(false)}>영상 + 가사</button>
        <button type="button" aria-pressed={onlyLyrics} onClick={() => setTextMode(true)}>가사만 보기</button>
      </div>
      <div className="guide-export-options">
        <label><input type="checkbox" checked={translation} onChange={event => setTranslation(event.target.checked)} /> 이미지에 번역 포함</label>
        <button className="guide-export-button" type="button" disabled={busy} onClick={() => void generate()}>{busy ? "이미지 생성 중…" : "한 장 이미지로 내보내기 ↓"}</button>
      </div>
    </div>
    {error && <p role="alert" className="portable-message">{error}</p>}
    {picture && <section className="guide-image-preview" aria-label="콜가이드 이미지 미리보기">
      <div className="guide-image-actions"><strong>콜가이드 이미지</strong><a href={picture.url} download={picture.file.name}>PNG 다운로드 ↓</a>
        {typeof navigator.canShare === "function" && navigator.canShare({ files: [picture.file] }) && <button type="button" onClick={() => void share()}>기기에 저장 / 공유</button>}
        <button type="button" onClick={() => setPicture(null)}>닫기</button></div>
      <p>모바일에서는 이미지를 길게 눌러 사진에 저장할 수도 있습니다.</p>
      <a href={picture.url} download={picture.file.name}><img src={picture.url} alt={`${song.title} 전체 가사 및 콜가이드 저장용 이미지`} /></a>
    </section>}
    {onlyLyrics ? <section className="static-lyrics" aria-label="전체 가사 및 콜 안내">
      <p className="static-legend">주황색 굵은 글씨: 떼창 / 콜 · 각 소절 위에 동작·환호 안내 표시</p>
      {portableLines(song, sync).map((line, index) => <article key={line.id} className={`static-lyric${line.cues.some(cue => cue.kind === "sing") ? " is-sing" : ""}`}>
        <span className="static-line-number">{String(index + 1).padStart(2, "0")}</span>
        <div>{line.cues.map(cue => <p className="static-cue" key={cue.id}><strong>[{cueNames[cue.kind]}] {cue.title}</strong>{cue.detail && ` · ${cue.detail}`}{cue.pattern && ` (${cue.pattern})`}</p>)}
          <p lang="ja"><Tokens tokens={line.original} /></p><p className="static-pronunciation"><Tokens tokens={line.pronunciation} /></p><p className="static-translation"><Tokens tokens={line.translation} /></p>
        </div>
      </article>)}
    </section> : children}
    <div className="guide-offline-footer"><OfflineStatus /></div>
  </>;
}
