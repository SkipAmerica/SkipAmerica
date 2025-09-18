import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./index.css";
import { config } from "./shared/config/index.ts";

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