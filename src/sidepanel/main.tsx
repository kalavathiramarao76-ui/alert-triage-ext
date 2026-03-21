import React from "react";
import ReactDOM from "react-dom/client";
import { SidePanel } from "./SidePanel";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import "../shared/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="IncidentIQ Panel Crashed">
      <SidePanel />
    </ErrorBoundary>
  </React.StrictMode>
);
