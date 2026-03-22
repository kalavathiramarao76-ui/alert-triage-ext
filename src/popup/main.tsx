import React from "react";
import ReactDOM from "react-dom/client";
import { Popup } from "./Popup";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { AuthWall } from "../shared/AuthWall";
import "../shared/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="IncidentIQ Popup Crashed">
      <AuthWall>
        <Popup />
      </AuthWall>
    </ErrorBoundary>
  </React.StrictMode>
);
