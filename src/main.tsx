import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { ErrorBoundary } from "./components/runtime/ErrorBoundary";
import { resetLocalDataset } from "./data/repositories";
import "./styles/globals.css";

function showBootError(error: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  const message = error instanceof Error ? error.message : String(error);
  root.innerHTML = `
    <main class="crash-screen">
      <section class="panel crash-panel">
        <p class="eyebrow">SES-Track 02 startup recovery</p>
        <h1>The app could not start.</h1>
        <p>This usually means the browser has stale local data or a deployment asset failed to load.</p>
        <pre class="code-block"></pre>
        <div class="template-actions">
          <button id="reset-local-data">Reset local data and reload</button>
          <button class="ghost" id="reload-app">Reload only</button>
        </div>
      </section>
    </main>`;
  root.querySelector("pre")!.textContent = message;
  root.querySelector("#reset-local-data")?.addEventListener("click", () => {
    resetLocalDataset();
    window.location.reload();
  });
  root.querySelector("#reload-app")?.addEventListener("click", () => window.location.reload());
}

window.addEventListener("error", (event) => showBootError(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => showBootError(event.reason));

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (error) {
  showBootError(error);
}

