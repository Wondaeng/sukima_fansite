import { Route, Routes } from "react-router-dom";
import { CallGuidePage } from "./call-guide/page";
import { SongGuidePage } from "./call-guide/song-guide-page";
import { HomePage } from "./page";
import { ShowsPage } from "./shows/page";
import { QuizPage } from "./quiz/page";
import SuikaPage from "./suika/page";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shows" element={<ShowsPage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/suika" element={<SuikaPage />} />
      <Route path="/call-guide" element={<CallGuidePage />} />
      <Route path="/call-guide/:slug" element={<SongGuidePage />} />
      <Route path="*" element={<SongGuidePage />} />
    </Routes>
  );
}
