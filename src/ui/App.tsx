import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useState } from "react";
import { Dashboard } from "./views/Dashboard";
import { RunDetail } from "./views/RunDetail";
import { FailureAnalysis } from "./views/FailureAnalysis";
import { TestCases } from "./views/TestCases";
import { ManualTestCases } from "./views/ManualTestCases";

export type ViewType = "dashboard" | "run-detail" | "failures" | "testcases" | "manual-cases";

interface ViewData {
  view: ViewType;
  [key: string]: unknown;
}

export function TestDinoApp() {
  const [viewData, setViewData] = useState<ViewData | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  const { app, error } = useApp({
    appInfo: { name: "TestDino", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolinput = (input) => {
        console.info("Tool input:", input);
      };

      app.ontoolresult = (result) => {
        console.info("Tool result:", result);
        if (result.structuredContent) {
          setViewData(result.structuredContent as ViewData);
        }
      };

      app.ontoolcancelled = (params) => {
        console.info("Tool cancelled:", params.reason);
      };

      app.onerror = console.error;

      app.onhostcontextchanged = (ctx) => {
        setHostContext((prev) => ({ ...prev, ...ctx }));
      };

      app.onteardown = async () => ({});
    },
  });

  useEffect(() => {
    if (app) {
      setHostContext(app.getHostContext());
    }
  }, [app]);

  if (error) {
    return (
      <div className="app-container">
        <div className="error-state">Connection error: {error.message}</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner" />
          Connecting to host...
        </div>
      </div>
    );
  }

  return (
    <AppContent
      app={app}
      viewData={viewData}
      setViewData={setViewData}
      hostContext={hostContext}
    />
  );
}

interface AppContentProps {
  app: App;
  viewData: ViewData | null;
  setViewData: (data: ViewData | null) => void;
  hostContext?: McpUiHostContext;
}

function AppContent({ app, viewData, setViewData, hostContext }: AppContentProps) {
  const navigate = useCallback(
    (view: ViewType, data?: Record<string, unknown>) => {
      setViewData({ view, ...data });
    },
    [setViewData],
  );

  const callTool = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      try {
        const result: CallToolResult = await app.callServerTool({ name, arguments: args });
        return result.structuredContent as Record<string, unknown> | undefined;
      } catch (e) {
        console.error("Tool call failed:", e);
        return undefined;
      }
    },
    [app],
  );

  if (!viewData) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner" />
          Waiting for data...
        </div>
      </div>
    );
  }

  const commonProps = { navigate, callTool, hostContext };

  return (
    <div
      className="app-container"
      style={{
        paddingTop: hostContext?.safeAreaInsets?.top,
        paddingRight: hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft: hostContext?.safeAreaInsets?.left,
      }}
    >
      <div className="app-header">
        <svg className="logo" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="6" fill="#2563eb" />
          <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">T</text>
        </svg>
        <h1>TestDino</h1>
      </div>

      {viewData.error && (
        <div className="error-state" style={{ marginBottom: 16 }}>
          {String(viewData.error)}
        </div>
      )}

      {viewData.view === "dashboard" && <Dashboard data={viewData} {...commonProps} />}
      {viewData.view === "run-detail" && <RunDetail data={viewData} {...commonProps} />}
      {viewData.view === "failures" && <FailureAnalysis data={viewData} {...commonProps} />}
      {viewData.view === "testcases" && <TestCases data={viewData} {...commonProps} />}
      {viewData.view === "manual-cases" && <ManualTestCases data={viewData} {...commonProps} />}
    </div>
  );
}
