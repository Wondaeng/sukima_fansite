import { updateOfflineContent, useOffline } from "../offline";
import "./portable-guide.css";

export function OfflineStatus() {
  const { online, saved, update, failed } = useOffline();
  const supported = "serviceWorker" in navigator;
  return <aside className="offline-status" aria-live="polite">
    <span className={`offline-dot${saved ? " is-saved" : ""}`} aria-hidden="true" />
    <div><strong>{!online ? "오프라인 · 저장된 가사 보기" : saved ? "오프라인 저장 완료 · 전체 곡" : import.meta.env.DEV ? "오프라인 저장은 배포 사이트에서 지원됩니다" : !supported ? "이 브라우저는 오프라인 저장을 지원하지 않습니다" : failed ? "오프라인 저장 실패 · 연결 후 새로고침해 주세요" : "전체 곡 가사 저장 중…"}</strong>
      <p>가사·떼창·콜 안내 저장. 영상 재생에는 인터넷 연결이 필요합니다.</p>
    </div>
    {update && <button type="button" onClick={() => void updateOfflineContent()}>최신 가사로 업데이트</button>}
  </aside>;
}
