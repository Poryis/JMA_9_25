import { useState, useCallback } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { AnimatePresence } from "framer-motion";
import HomePage from "./pages/HomePage";
import ForParentsPage from "./pages/ForParentsPage";
import PlayMenuPage from "./pages/PlayMenuPage";
import LearnMenuPage from "./pages/LearnMenuPage";
import CreateMenuPage from "./pages/CreateMenuPage";
import LessonsPage from "./pages/LessonsPage";
import LessonPlayerPage from "./pages/LessonPlayerPage";
import FreePlayPage from "./pages/FreePlayPage";
import RhythmGamePage from "./pages/RhythmGamePage";
import SimonSaysPage from "./pages/SimonSaysPage";
import EarTrainerPage from "./pages/EarTrainerPage";
import LoopStudioPage from "./pages/LoopStudioPage";
import StickerBookPage from "./pages/StickerBookPage";
import FunFactsPage from "./pages/FunFactsPage";
import NoteMatchPage from "./pages/NoteMatchPage";
import DetectivePage from "./pages/DetectivePage";
import SongStudioPage from "./pages/SongStudioPage";
import SightReadingPage from "./pages/SightReadingPage";
import NameThatNotePage from "./pages/NameThatNotePage";
import BoomGardenPage from "./pages/BoomGardenPage";
import RobotBoogiePage from "./pages/RobotBoogiePage";
import JMAtvHomePage from "./pages/JMAtvHomePage";
import JMAtvChannelPage from "./pages/JMAtvChannelPage";
import JMAtvPlayerPage from "./pages/JMAtvPlayerPage";
import StickerToast from "./components/StickerToast";
import RankUpCelebration from "./components/RankUpCelebration";
import AudioUnlockOverlay from "./components/AudioUnlockOverlay";
import PlayerNamePrompt from "./components/PlayerNamePrompt";
import usePlayTime from "./hooks/usePlayTime";

// RootGate — always send visitors straight to the app Home. The
// parent-facing landing page (marketing pitch) is still reachable via
// the "For Grown-ups" link in the header.
function RootGate() {
  return <Navigate to="/home" replace />;
}

function App() {
  const [score, setScore] = useState(0);
  const [gameStats, setGameStats] = useState({
    perfect: 0, great: 0, good: 0, miss: 0, streak: 0, maxStreak: 0
  });

  const resetGame = useCallback(() => {
    setScore(0);
    setGameStats({ perfect: 0, great: 0, good: 0, miss: 0, streak: 0, maxStreak: 0 });
  }, []);

  // Tracks active time-on-app for the print report. Mounted once at App root.
  usePlayTime();

  return (
    <div className="App min-h-screen">
      <AudioUnlockOverlay />
      <PlayerNamePrompt />
      <HashRouter>
        <StickerToast />
        <RankUpCelebration />
        <AnimatePresence mode="wait">
          <ScrollToTop />
          <Routes>
            {/* Smart root gate:
                  - If the browser has a stored player profile (jma_player_v1)
                    OR the "skip name" flag → this is a returning kid, drop
                    them straight into the app Home.
                  - Otherwise → show the parent-facing landing page so a
                    parent can see the pitch before their kid grabs the
                    tablet.
                Once the parent taps "Take Me to the App" or "Start Playing",
                the PlayerNamePrompt handles first-name-only setup. */}
            <Route path="/" element={<RootGate />} />
            <Route path="/for-parents" element={<ForParentsPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/play" element={<PlayMenuPage />} />
            <Route path="/learn" element={<LearnMenuPage />} />
            <Route path="/create" element={<CreateMenuPage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lessons/:num" element={<LessonPlayerPage />} />
            <Route path="/free-play" element={<FreePlayPage />} />
            <Route path="/rhythm-game" element={
              <RhythmGamePage score={score} setScore={setScore} gameStats={gameStats} setGameStats={setGameStats} resetGame={resetGame} />
            } />
            <Route path="/simon-says" element={
              <SimonSaysPage score={score} setScore={setScore} gameStats={gameStats} setGameStats={setGameStats} resetGame={resetGame} />
            } />
            <Route path="/ear-trainer" element={<EarTrainerPage />} />
            <Route path="/loop-studio" element={<LoopStudioPage />} />
            <Route path="/fun-facts" element={<FunFactsPage />} />
            <Route path="/note-match" element={<NoteMatchPage />} />
            <Route path="/detective" element={<DetectivePage />} />
            <Route path="/song-studio" element={<SongStudioPage />} />
            <Route path="/sight-reading" element={<SightReadingPage />} />
            <Route path="/name-that-note" element={<NameThatNotePage />} />
            <Route path="/boom-garden" element={<BoomGardenPage />} />
            <Route path="/robot-boogie" element={<RobotBoogiePage />} />
            <Route path="/jmatv" element={<JMAtvHomePage />} />
            <Route path="/jmatv/:channelId" element={<JMAtvChannelPage />} />
            <Route path="/jmatv/:channelId/:episodeIndex" element={<JMAtvPlayerPage />} />
            <Route path="/sticker-book" element={<StickerBookPage />} />
          </Routes>
        </AnimatePresence>
      </HashRouter>
    </div>
  );
}

export default App;
