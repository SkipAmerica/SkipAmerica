import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./index.css";
import { config } from "./shared/config/index.ts";
import { normalizeError, safeStringify } from "./shared/errors/err-utils";
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Initialize PWA Elements for Capacitor Camera web support
defineCustomElements(window);

// Enable debugging in dev or when explicitly set (iOS debug builds)
const __DEV_IOS__ = import.meta.env.DEV || (window as any).__SKIP_DEBUG__ === true;

// Global error handlers (dev and iOS debug builds)
if (__DEV_IOS__) {
  // Enable live debugging
  (window as any).__LIVE_DEBUG = true;
  // Enable channel teardown for proper cleanup
  (window as any).__allow_ch_teardown = true;

  // Global error handler with immutable logging
  window.addEventListener('error', (event) => {
    const normalized = normalizeError(event.error, {
      where: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    console.error('[window.error]', safeStringify(normalized));
  });

  // Unhandled promise rejections with immutable logging
  window.addEventListener('unhandledrejection', (event) => {
    const normalized = normalizeError(event.reason, {
      where: 'unhandledrejection'
    });
    console.error('[unhandledrejection]', safeStringify(normalized));
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
  // StrictMode temporarily disabled during media provider stabilization
  // TODO: Re-enable after join guards are verified stable
  // <StrictMode>
    <App />
  // </StrictMode>,
);