import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TestDinoApp } from "./App";
import "./styles.css";
import React from "react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TestDinoApp />
  </StrictMode>,
);
