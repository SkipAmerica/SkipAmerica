import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./index.css";
import { config } from "./shared/config/index.ts";
import { normalizeError } from "./shared/errors/normalizeError";

// Global error handlers (dev only)
if (import.meta.env.DEV) {
  // Enable live debugging
  (window as any).__LIVE_DEBUG = true;

  // Global error handler
  window.addEventListener('error', (event) => {
    const normalized = normalizeError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    console.error('[window.error]', normalized);
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const normalized = normalizeError(event.reason);
    console.error('[unhandledrejection]', normalized);
  });
}

// Set document title and meta tags from config
document.title = config.app.name;

// Update og:title meta tag
const ogTitle = document.querySelector('meta[property="og:title"]');
if (ogTitle) {
  ogTitle.setAttribute('content', config.app.name);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);