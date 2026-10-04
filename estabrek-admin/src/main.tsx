import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import "./App.css";
import "./theme/skins.css";
import "./cms/effects/effects.css";
import "./i18n";
import { queryClient } from "./lib/queryClient";
import { applySkin, readSkin } from "./theme/skin";

// Paint the chosen skin before the first render (no dark flash on the rose skin).
applySkin(readSkin());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
