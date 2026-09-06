import { Route, Routes } from "react-router-dom";
import { CallGuidePage } from "./call-guide/page";
import { SongGuidePage } from "./call-guide/song-guide-page";
import { HomePage } from "./page";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/call-guide" element={<CallGuidePage />} />
      <Route path="/call-guide/:slug" element={<SongGuidePage />} />
      <Route path="*" element={<SongGuidePage />} />
    </Routes>
  );
}
