import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import "@arise/ui/tokens.css";
import "./styles/system.css";

// Avoid `virtual:pwa-register`: a stale Vite without the PWA plugin 500s
// main.tsx and blanks every route. Production SW is /sw.js from injectManifest.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // Offline install is best-effort. Never block first paint.
  });
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
