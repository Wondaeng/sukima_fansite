import { useEffect, useRef } from "react";
import gameUrl from "../../suika-game/sukima-suika.html?url";
import { FanPageShell } from "../fan-page-shell";
import "../fan-pages.css";

export default function SuikaPage() {
  const resizeObserver = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => resizeObserver.current?.disconnect();
  }, []);

  function fitGame(frame: HTMLIFrameElement) {
    resizeObserver.current?.disconnect();
    const body = frame.contentDocument?.body;
    if (!body) return;

    // Keep one page scrollbar as the game's layout changes with width and language.
    const fit = () => { frame.style.height = `${Math.ceil(body.getBoundingClientRect().height)}px`; };
    fit();
    resizeObserver.current = new ResizeObserver(fit);
    resizeObserver.current.observe(body);
  }

  return (
    <FanPageShell title="스키마 수박게임" description="같은 조각을 합쳐 夏雲ノイズ 앨범을 완성하는 스키마스위치 수박게임">
      <iframe className="suika-game-frame" src={gameUrl} title="SUKIMA SUIKA GAME"
        onLoad={event => fitGame(event.currentTarget)} />
    </FanPageShell>
  );
}
