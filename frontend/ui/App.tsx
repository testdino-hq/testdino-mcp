import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dashboard } from "./views/Dashboard";
import { RunDetail } from "./views/RunDetail";
import { FailureAnalysis } from "./views/FailureAnalysis";
import { TestCases } from "./views/TestCases";
import { ManualTestCases } from "./views/ManualTestCases";
import { ProjectPicker } from "./views/ProjectPicker";
import { TestCaseDetail } from "./views/TestCaseDetail";
import { ManualCaseDetail } from "./views/ManualCaseDetail";
import { ManualSuites } from "./views/ManualSuites";
import { ActionResult } from "./views/ActionResult";

export type ViewType = "project-picker" | "dashboard" | "run-detail" | "failures" | "testcases" | "manual-cases" | "testcase-detail" | "manual-case-detail" | "manual-suites" | "action-result";

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
        // Primary: use structuredContent if the host forwards it
        const sc = result.structuredContent as ViewData | undefined;
        if (sc?.view) {
          setViewData(sc);
          return;
        }
        // Fallback: parse content[0].text as JSON (hosts that don't forward structuredContent)
        const textBlock = (result.content as any[])?.find((c: any) => c.type === "text");
        if (textBlock?.text) {
          try {
            const parsed = JSON.parse(textBlock.text) as ViewData;
            if (parsed?.view) {
              setViewData(parsed);
            }
          } catch {
            // not JSON, ignore
          }
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
  const [projectId, setProjectId] = useState<string>("");
  const [cachedOrgs, setCachedOrgs] = useState<unknown[]>([]);
  const [navLoading, setNavLoading] = useState<"testruns" | "manual" | null>(null);
  const [history, setHistory] = useState<ViewData[]>([]);
  const isInternalNavRef = useRef(false);

  useEffect(() => {
    if (!isInternalNavRef.current) {
      setHistory([]);
    }
    isInternalNavRef.current = false;
    if (viewData?.projectId) setProjectId(viewData.projectId as string);
    if (viewData?.view === "project-picker" && Array.isArray(viewData.orgs)) {
      setCachedOrgs(viewData.orgs as unknown[]);
    }
  }, [viewData]);

  const navigate = useCallback(
    (view: ViewType, data?: Record<string, unknown>) => {
      isInternalNavRef.current = true;
      if (viewData) setHistory((h) => [...h, viewData]);
      setViewData({ view, ...data });
    },
    [viewData, setViewData],
  );

  const goBack = useCallback(() => {
    setHistory((h) => {
      const copy = [...h];
      const prev = copy.pop();
      if (prev) {
        isInternalNavRef.current = true;
        setViewData(prev);
      }
      return copy;
    });
  }, [setViewData]);

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

  const handleNavSwitch = useCallback(
    async (section: "testruns" | "manual") => {
      if (!projectId) return;
      setNavLoading(section);
      if (section === "manual") {
        const result = await callTool("show_testdino", { _action: "fetch_manual_testcases", projectId });
        if (result) navigate("manual-cases", { projectId, manualCases: result.manualCases });
      } else {
        const result = await callTool("show_testdino", { _action: "fetch_testruns", projectId });
        if (result) navigate("dashboard", { projectId, testruns: result.testruns });
      }
      setNavLoading(null);
    },
    [projectId, callTool, navigate],
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

  const activeSection: "testruns" | "manual" = viewData.view === "manual-cases" ? "manual" : "testruns";
  const commonProps = { navigate, callTool, hostContext };

  return (
    <div
      className="app-container"
      style={{
        paddingTop:    hostContext?.safeAreaInsets?.top,
        paddingRight:  hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft:   hostContext?.safeAreaInsets?.left,
      }}
    >
      {/* Header */}
      <div className="app-header">
        <svg className="logo" viewBox="0 0 34 31" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ color: "var(--foreground)" }}>
          <path d="M20.8859 1.10946C20.4487 1.40591 20.1716 1.69978 20.0419 2.18765C19.9454 2.79907 20.0638 3.27528 20.4634 3.7731C21.1297 4.47761 22.2482 4.84071 23.2355 4.92191C23.6751 4.93369 24.0688 4.87966 24.4911 4.76869C24.9056 4.70744 25.2871 4.95722 25.581 5.25593C27.1901 6.89147 28.2235 9.35052 28.319 11.4642C28.3591 12.9282 28.373 14.5569 27.2591 15.712C26.4512 16.4361 25.4031 16.7088 24.3022 16.7138C23.5285 16.7013 22.8027 16.5151 22.0595 16.3328C20.6893 16.0044 19.4032 15.7659 17.9767 15.7678C17.8876 15.7679 17.8876 15.7679 17.7967 15.768C14.3875 15.7813 11.3356 17.1241 8.93524 19.311C7.91827 20.2644 7.14137 21.408 6.41712 22.5573C5.75036 23.6119 4.98522 24.5364 4.0479 25.4022C3.90403 25.536 3.74464 25.6532 3.57047 25.7441C3.41428 25.8256 3.26731 25.8975 3.12878 25.9609C2.05928 26.45 -0.183289 25.5451 0.124298 26.6802C0.402401 27.7065 2.79921 29.5879 7.95539 28.1361C9.10179 27.8134 10.1031 27.189 11.1247 26.6168C11.1958 26.5769 11.2841 26.6243 11.2906 26.7056C11.3668 27.6031 11.6735 28.5497 11.8939 29.4375C12.4228 30.6481 14.9794 30.4867 15.4202 29.7603C15.5187 29.5767 15.5689 29.3831 15.626 29.1863C15.7237 28.7979 15.8039 28.4079 15.8775 28.0151C15.8931 27.934 15.9087 27.853 15.9248 27.7695C15.9439 27.6704 15.9629 27.5713 15.9817 27.4722C16.0132 27.3065 16.1673 27.1932 16.3348 27.213C17.7102 27.3692 19.0496 27.3467 20.4261 27.2697C20.5366 27.2635 20.6337 27.3426 20.6496 27.4521C20.6873 27.7075 20.7259 27.9711 20.7647 28.23C20.8336 28.6905 20.8173 29.1838 21.0356 29.5951C21.9083 31.239 26.0015 31.2135 27.2201 29.7245C27.7841 29.0353 27.579 28.01 27.6797 27.1252C27.7131 26.8297 27.7459 26.5342 27.7771 26.2385C27.8076 25.9504 27.8406 25.6626 27.8741 25.3748C27.8828 25.2863 27.8916 25.1979 27.9006 25.1067C27.9475 24.7155 27.9577 24.6302 28.0952 24.4091C28.1897 24.2572 28.3197 24.1309 28.4674 24.0302C28.5692 23.9545 28.5692 23.9545 28.673 23.8773C28.7813 23.8006 28.7813 23.8006 28.8917 23.7225C29.9918 22.9032 30.9723 21.9831 31.7292 20.8826C31.761 20.8371 31.7928 20.7916 31.8255 20.7447C32.7915 19.3421 33.2837 17.7406 33.5144 16.1058C33.5218 16.0536 33.5292 16.0015 33.5368 15.9478C34.0296 12.3678 33.554 8.73827 31.6411 5.54833C31.6104 5.49717 31.5797 5.44601 31.5481 5.3933C30.6622 3.93749 29.4536 2.55526 28.0266 1.513C27.9397 1.44745 27.8528 1.38191 27.7632 1.31438C25.6135 -0.278803 23.1476 -0.270677 20.8859 1.10946ZM27.7622 2.96572C27.8084 3.005 27.8547 3.04429 27.9023 3.08477C30.5732 5.36259 32.2324 8.70152 32.3644 12.0514C32.3752 12.4529 32.3757 12.8542 32.3739 13.2558C32.3738 13.3267 32.3736 13.3976 32.3735 13.4706C32.3698 14.5838 32.3159 15.6713 32.0819 16.7666C32.0687 16.8298 32.0554 16.8929 32.0418 16.958C31.4677 19.617 29.725 21.8125 27.3007 23.3454C26.5025 23.9074 26.4421 23.9499 25.6738 24.205C25.5779 24.2368 25.4803 24.1599 25.4894 24.0592C25.5306 23.5742 25.5682 23.0888 25.5858 22.6027C25.5867 22.5821 25.5874 22.5652 25.588 22.5507C25.5932 22.4304 25.6029 22.3041 25.551 22.1954C25.4854 22.0578 25.3306 21.9777 25.1806 21.951C25.165 21.9482 25.1496 21.9461 25.1344 21.9445C24.8304 21.9132 24.496 22.102 24.4505 22.4042C24.4455 22.4375 24.4407 22.4747 24.435 22.5174C24.425 22.5891 24.4151 22.6608 24.4048 22.7347C24.3897 22.8525 24.3897 22.8525 24.3743 22.9728C24.3632 23.055 24.3521 23.1372 24.3407 23.2219C24.3047 23.4912 24.2701 23.7606 24.2359 24.0302C24.2187 24.1653 24.2187 24.1653 24.2012 24.3032C24.1189 24.9552 24.0394 25.6074 23.9604 26.2597C23.9145 26.6391 23.8683 27.0184 23.822 27.3978C23.8117 27.4834 23.8014 27.5691 23.7908 27.6574C23.7811 27.737 23.7713 27.8166 23.7613 27.8986C23.7529 27.9681 23.7445 28.0376 23.7358 28.1092C23.7234 28.1945 23.7293 28.5525 23.7369 28.9529C23.7512 29.7072 23.1803 30.0838 22.5998 29.602C22.3011 29.3541 22.1307 29.0243 22.1023 28.6372C22.0744 28.2564 22.0504 27.8294 22.0099 27.6014C22 27.5457 21.9901 27.49 21.9798 27.4326C21.8687 26.8072 21.761 26.1817 21.6659 25.5541C21.6504 25.4521 21.6349 25.35 21.619 25.2448C21.5899 25.0505 21.5614 24.8561 21.5334 24.6617C21.5203 24.5738 21.5072 24.4858 21.4937 24.3952C21.4827 24.3186 21.4716 24.242 21.4602 24.163C21.4515 24.122 21.4418 24.0821 21.4311 24.0429C21.3428 23.719 20.9845 23.429 20.6513 23.4699C20.4477 23.4948 20.3209 23.6169 20.2662 23.8146C20.162 24.1912 20.2992 24.6538 20.357 25.0188C20.3733 25.1125 20.3897 25.2061 20.4066 25.3026C20.4633 25.6868 20.1713 26.0182 19.7854 26.0621C19.2654 26.1212 18.7484 26.144 18.2136 26.1437C18.1327 26.1437 18.0518 26.1438 17.9684 26.1438C17.0195 26.1648 16.4198 25.2401 16.6303 24.3145C16.6438 24.2546 16.6573 24.1947 16.6713 24.1329C16.7274 23.8847 16.7836 23.6365 16.8412 23.3885C17.0436 22.5137 17.134 22.1229 17.1554 21.8738C17.1837 21.5455 16.9635 21.2174 16.6349 21.1926C16.4273 21.1769 16.1903 21.2507 16.0747 21.4239C15.9847 21.5588 15.9529 21.7127 15.9104 21.9072C15.8892 22.0019 15.868 22.0967 15.8461 22.1943C15.8241 22.2974 15.8021 22.4006 15.7793 22.5068C15.7554 22.6153 15.7313 22.7237 15.7072 22.8321C15.6435 23.1193 15.5809 23.4067 15.5187 23.6942C15.4206 24.1458 15.3208 24.5971 15.2211 25.0485C15.1966 25.1598 15.1721 25.271 15.1476 25.3823C14.9509 26.2779 14.7972 27.4777 14.6017 28.4892C14.5221 28.9008 14.1616 29.1863 13.7424 29.1863C13.2911 29.1863 12.8954 28.8572 12.8205 28.4121C12.8097 28.3481 12.8011 28.296 12.7964 28.2644C12.7227 27.7768 12.6476 27.2895 12.5715 26.8022C12.5255 26.5068 12.48 26.2114 12.4358 25.9158C12.3931 25.6304 12.3489 25.3453 12.3037 25.0602C12.2868 24.9515 12.2703 24.8427 12.2544 24.7339C12.232 24.5813 12.2076 24.429 12.1831 24.2766C12.1769 24.2366 12.1708 24.1966 12.1646 24.1564C12.15 24.0615 12.1309 23.9666 12.0925 23.8786C12.0565 23.7963 12.0154 23.7305 11.9618 23.6699C11.824 23.5141 11.6047 23.4481 11.3985 23.4756C11.3693 23.4795 11.3403 23.4849 11.3074 23.4923C11.1714 23.5228 11.0443 23.5742 10.9846 23.7002C10.9397 23.7949 10.9305 23.9227 10.9443 24.0266C10.9575 24.1258 10.9719 24.2249 10.9896 24.3235C10.9991 24.3803 11.0076 24.4312 11.0149 24.4774C11.1099 25.0743 10.5895 25.5483 10.0426 25.8057C9.93548 25.864 9.82885 25.9229 9.72267 25.9826C7.7792 27.3273 5.48272 27.7284 3.16278 27.6731C2.49059 27.6571 2.18918 26.9378 2.86152 26.9313C2.9236 26.9307 3.03715 26.9241 3.0976 26.91C5.41568 26.3681 6.54667 24.726 8.03735 22.4337C9.68106 19.9287 12.2062 17.9633 15.3319 17.2082C15.9979 17.0634 16.6757 16.9597 17.3596 16.928C17.4464 16.9237 17.5333 16.9194 17.6227 16.9151C19.2279 16.8754 20.7685 17.2245 22.3105 17.5913C22.3994 17.6124 22.3994 17.6124 22.4901 17.634C22.6524 17.6727 22.8144 17.7119 22.9765 17.7512C24.4403 18.0776 25.9261 17.8923 27.2494 17.2363C28.4433 16.5299 29.0791 15.5967 29.3893 14.3439C30.0475 11.4669 29.4275 8.4129 27.6925 5.93975C26.8597 4.79392 25.9961 2.92953 24.3516 3.57606C23.6373 3.8272 22.9476 3.72576 22.2544 3.46572C22.0316 3.3691 21.8395 3.28491 21.6791 3.16975C21.3466 2.93117 21.2533 2.42027 21.5636 2.1536C23.8492 0.589539 25.8847 1.33336 27.7622 2.96572ZM25.6107 25.4673C26.0939 25.1794 26.555 25.6525 26.4861 26.2108C26.3751 27.1081 26.2479 28.1397 26.1447 28.9737C26.1076 29.2732 26.0202 29.5068 25.7796 29.689C25.2005 30.1274 24.6321 29.7226 24.7675 29.009C24.8806 28.4132 24.9973 27.8092 25.0132 27.6244C25.0243 27.4835 25.0334 27.3425 25.041 27.2015C25.05 26.4371 25.0509 26.3563 25.3118 25.81C25.3791 25.6689 25.4764 25.5473 25.6107 25.4673Z" fill="currentColor" stroke="currentColor" strokeWidth="0.191283"/>
          <circle cx="23.5409" cy="2.50477" r="0.454643" fill="currentColor" stroke="currentColor" strokeWidth="0.0826713"/>
        </svg>
        <h1>TestDino</h1>
        {projectId && <span className="project-tag">{projectId}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {history.length > 0 && (
            <button className="btn btn-sm" onClick={goBack}>
              ← Back
            </button>
          )}
          {cachedOrgs.length > 0 && viewData.view !== "project-picker" && (
            <button className="btn btn-sm" onClick={() => navigate("project-picker", { orgs: cachedOrgs })}>
              Change Project
            </button>
          )}
        </div>
      </div>

      {/* Top nav — hidden on project picker */}
      {viewData.view !== "project-picker" && (
        <div className="app-nav">
          <button
            className={`app-nav-tab ${activeSection === "testruns" ? "active" : ""}`}
            onClick={() => handleNavSwitch("testruns")}
            disabled={navLoading === "testruns"}
          >
            {navLoading === "testruns" ? "Loading..." : "Test Runs"}
          </button>
          <button
            className={`app-nav-tab ${activeSection === "manual" ? "active" : ""}`}
            onClick={() => handleNavSwitch("manual")}
            disabled={navLoading === "manual"}
          >
            {navLoading === "manual" ? "Loading..." : "Manual Tests"}
          </button>
        </div>
      )}

      {viewData.error != null && (
        <div className="error-state" style={{ marginBottom: 16 }}>
          {String(viewData.error)}
        </div>
      )}

      {viewData.view === "project-picker" && <ProjectPicker data={viewData} {...commonProps} />}
      {viewData.view === "dashboard" && <Dashboard data={viewData} {...commonProps} />}
      {viewData.view === "run-detail" && <RunDetail data={viewData} {...commonProps} />}
      {viewData.view === "failures" && <FailureAnalysis data={viewData} {...commonProps} />}
      {viewData.view === "testcases" && <TestCases data={viewData} {...commonProps} />}
      {viewData.view === "manual-cases" && <ManualTestCases data={viewData} {...commonProps} />}
      {viewData.view === "testcase-detail" && <TestCaseDetail data={viewData} {...commonProps} />}
      {viewData.view === "manual-case-detail" && <ManualCaseDetail data={viewData} {...commonProps} />}
      {viewData.view === "manual-suites" && <ManualSuites data={viewData} {...commonProps} />}
      {viewData.view === "action-result" && <ActionResult data={viewData} {...commonProps} />}
    </div>
  );
}
