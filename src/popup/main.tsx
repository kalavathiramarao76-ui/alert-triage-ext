import React from "react";
import ReactDOM from "react-dom/client";
import { Popup } from "./Popup";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import "../shared/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="TriageFlow AI Popup Crashed">
      <Popup />
    </ErrorBoundary>
  </React.StrictMode>
);
