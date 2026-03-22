import React from "react";
import ReactDOM from "react-dom/client";
import { SidePanel } from "./SidePanel";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { AuthWall } from "../shared/AuthWall";
import "../shared/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="IncidentIQ Panel Crashed">
      <AuthWall>
        <SidePanel />
      </AuthWall>
    </ErrorBoundary>
  </React.StrictMode>
);
