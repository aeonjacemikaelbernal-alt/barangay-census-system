import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "./theme.css";
import "./pages/recordsUi.css";
import { applyAppTheme } from "./utils/theme";

applyAppTheme("light");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
