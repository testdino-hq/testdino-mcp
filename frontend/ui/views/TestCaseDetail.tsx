import type { ViewType } from "../App";

interface TestCaseDetailProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function TestCaseDetail({ data, navigate }: TestCaseDetailProps) {
  const projectId  = data.projectId as string;
  const tc         = (data.testcase as any) || {};

  const title      = tc.title || tc.name || tc.testcaseName || "Test Case";
  const status     = tc.status;
  const duration   = tc.duration;
  const specFile   = tc.specFile   || tc.spec_file;
  const browser    = tc.browser    || tc.browserName;
  const errorMsg   = tc.error      || tc.errorMessage  || tc.failureMessage;
  const stackTrace = tc.stackTrace || tc.stack          || tc.failureStack;
  const steps      = Array.isArray(tc.steps)       ? tc.steps       : [];
  const logs       = Array.isArray(tc.consoleLogs) ? tc.consoleLogs
                   : Array.isArray(tc.logs)        ? tc.logs        : [];

  return (
    <div className="view-fade-in">
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Test Case Detail</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {status && <span className={`badge badge-${status}`}>{status}</span>}
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
            {title}
          </span>
        </div>
        <div className="meta-row">
          {specFile && (
            <span className="meta-item">
              <FileIcon />
              <span>{specFile}</span>
            </span>
          )}
          {browser && (
            <span className="meta-item">
              <GlobeIcon />
              <span>{browser}</span>
            </span>
          )}
          {duration != null && (
            <span className="meta-item">
              <ClockIcon />
              <span>{duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}</span>
            </span>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="section">
          <div className="section-title">Error</div>
          <div className="error-box">{errorMsg}</div>
        </div>
      )}

      {/* Stack trace */}
      {stackTrace && (
        <div className="section">
          <div className="section-title">Stack Trace</div>
          <div className="code-block">{stackTrace}</div>
        </div>
      )}

      {/* Test steps */}
      {steps.length > 0 && (
        <div className="section">
          <div className="section-title">Steps</div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Action</th>
                  <th>Expected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step: any, i: number) => (
                  <tr key={i}>
                    <td style={{ color: "var(--muted-foreground)" }}>{i + 1}</td>
                    <td className="wrap-cell">{step.action || step.title || step.description}</td>
                    <td className="wrap-cell" style={{ color: "var(--muted-foreground)" }}>{step.expectedResult || step.expected || "—"}</td>
                    <td>
                      {step.status && <span className={`badge badge-${step.status}`}>{step.status}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Console logs */}
      {logs.length > 0 && (
        <div className="section">
          <div className="section-title">Console Logs</div>
          <div className="code-block">
            {logs.map((log: any, i: number) => (
              <div key={i}>{typeof log === "string" ? log : JSON.stringify(log)}</div>
            ))}
          </div>
        </div>
      )}

      {/* Raw metadata fallback */}
      {!errorMsg && !stackTrace && steps.length === 0 && (
        <div className="detail-panel">
          {Object.entries(tc)
            .filter(([k]) => !["_id", "__v"].includes(k))
            .map(([k, v]) => (
              <div key={k} className="detail-row">
                <div className="detail-label">{k}</div>
                <div className="detail-value" style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2 8h12M8 2c-1.5 2-2 4-2 6s.5 4 2 6M8 2c1.5 2 2 4 2 6s-.5 4-2 6"
        stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
