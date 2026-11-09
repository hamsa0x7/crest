import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "../../styles/global.css";
import { settings, type Settings } from "../../settings/store";
import { LyricsCardApp } from "./LyricsCardApp";
import { language, startLanguage } from "../../i18n";
import { startThemes } from "../themes/store";

window.addEventListener("storage", (e) => {
  if (e.key !== "notch:settings" || !e.newValue) return;
  try {
    settings.set(JSON.parse(e.newValue) as Settings);
  } catch {
    // keep current
  }
});

startThemes();

window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
});
window.addEventListener("drop", (e) => e.preventDefault());
window.addEventListener("keydown", (e) => {
  if (e.key === "F5" || e.key === "F7" || e.key === "F12" || (e.ctrlKey && ["r", "p", "f", "j", "u", "s"].includes(e.key.toLowerCase()))) e.preventDefault();
});

function App() {
  language.use();
  return (
    <MotionConfig reducedMotion="user">
      <LyricsCardApp />
    </MotionConfig>
  );
}

void startLanguage(settings).then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
);
