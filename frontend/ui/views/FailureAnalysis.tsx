import { useState, useCallback } from "react";
import type { App } from "@modelcontextprotocol/ext-apps";
import type { ViewType } from "../App";

interface FailureAnalysisProps {
  app: App;
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function FailureAnalysis({ app, data, navigate }: FailureAnalysisProps) {
  const projectId    = data.projectId   as string;
  const debugData    = data.debugData   as any;
  const testcaseName = data.testcaseName as string;
  const [activeTab, setActiveTab] = useState<"summary" | "history" | "errors">("summary");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const history        = debugData?.history         || debugData?.testRuns        || [];
  const errorCategories = debugData?.errorCategories || debugData?.error_categories || [];
  const commonErrors   = debugData?.commonErrors    || debugData?.common_errors    || [];
  const debugPrompt    = debugData?.debugging_prompt || debugData?.debuggingPrompt || "";

  const failureCount = history.filter((h: any) => h.status === "failed").length;
  const totalCount   = history.length;
  const failureRate  = totalCount > 0 ? Math.round((failureCount / totalCount) * 100) : 0;

  const handleSendToChat = useCallback(async () => {
    if (!debugPrompt || sending) return;
    setSending(true);
    try {
      await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: debugPrompt }],
      });
      setSent(true);
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  }, [app, debugPrompt, sending]);

  return (
    <div className="view-fade-in">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Failure Analysis</span>
      </div>

      <div className="page-heading">
        <div className="page-heading-title">{testcaseName || "Failure Analysis"}</div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card failed">
          <div className="stat-label">Failure Rate</div>
          <div className="stat-value">{failureRate}%</div>
        </div>
        <div className="stat-card total">
          <div className="stat-label">Total Runs</div>
          <div className="stat-value">{totalCount}</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-label">Failures</div>
          <div className="stat-value">{failureCount}</div>
        </div>
        <div className="stat-card passed">
          <div className="stat-label">Passes</div>
          <div className="stat-value">{totalCount - failureCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>
          Summary
        </button>
        <button className={`tab ${activeTab === "errors" ? "active" : ""}`} onClick={() => setActiveTab("errors")}>
          Error Patterns
        </button>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          History ({totalCount})
        </button>
      </div>

      {activeTab === "summary" && (
        <div>
          {errorCategories.length > 0 && (
            <div className="section">
              <h3 className="section-title">Error Categories</h3>
              <div className="stats-bar">
                {errorCategories.map((cat: any, i: number) => (
                  <div key={i} className="stat-card failed">
                    <div className="stat-card-header">
                      <div className="stat-label">{cat.category || cat.name || `Category ${i + 1}`}</div>
                    </div>
                    <div className="stat-value">{cat.count || cat.occurrences || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {debugPrompt && (
            <div className="section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>AI Debugging Suggestion</h3>
                <button
                  className={`btn btn-sm ${sent ? "" : "btn-primary"}`}
                  onClick={handleSendToChat}
                  disabled={sending || sent}
                >
                  {sending ? (
                    <>
                      <span className="spinner" style={{ width: 12, height: 12 }} />
                      Sending...
                    </>
                  ) : sent ? (
                    <>
                      <SendCheckIcon />
                      Sent
                    </>
                  ) : (
                    <>
                      <SendIcon />
                      Send to AI
                    </>
                  )}
                </button>
              </div>
              <FormattedPrompt text={debugPrompt} />
            </div>
          )}
        </div>
      )}

      {activeTab === "errors" && (
        <div>
          {commonErrors.length === 0 ? (
            <div className="empty-state">No error patterns found.</div>
          ) : (
            commonErrors.map((err: any, i: number) => (
              <div key={i} className="section">
                <div className="detail-panel">
                  <DetailRow label="Error"       value={err.message || err.error || err.errorMessage} />
                  <DetailRow label="Occurrences" value={String(err.count || err.occurrences || "")} />
                  <DetailRow label="Category"    value={err.category} />
                  {(err.stackTrace || err.stack) && (
                    <div style={{ marginTop: 8, padding: "0 0 8px" }}>
                      <div className="detail-label" style={{ marginBottom: 6 }}>Stack Trace</div>
                      <div className="code-block">{err.stackTrace || err.stack}</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div>
          {history.length === 0 ? (
            <div className="empty-state">No history data available.</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Status</th>
                    <th>Branch</th>
                    <th>Error</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any, i: number) => (
                    <tr key={i}>
                      <td>{h.counter || h.runCounter || i + 1}</td>
                      <td>
                        <span className={`badge badge-${h.status}`}>{h.status}</span>
                      </td>
                      <td>{h.branch || h.branchName || "—"}</td>
                      <td style={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--muted-foreground)",
                      }}>
                        {h.errorMessage || h.error || "—"}
                      </td>
                      <td style={{ color: "var(--muted-foreground)" }}>
                        {formatDate(h.date || h.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Formatted prompt ──────────────────────────────────── */
function FormattedPrompt({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const elements: { type: "intro" | "step" | "sub"; text: string; num?: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const stepMatch = trimmed.match(/^(\d+)\)\s*(.*)/);
    const arrowMatch = trimmed.match(/^→\s*(.*)/);
    if (stepMatch) {
      elements.push({ type: "step", text: stepMatch[2], num: stepMatch[1] });
    } else if (arrowMatch) {
      elements.push({ type: "sub", text: arrowMatch[1] });
    } else {
      elements.push({ type: "intro", text: trimmed });
    }
  }

  return (
    <div className="info-panel" style={{ whiteSpace: "normal" }}>
      {elements.map((el, i) => {
        if (el.type === "intro") {
          return <p key={i} style={{ marginBottom: 10, lineHeight: 1.6 }}>{el.text}</p>;
        }
        if (el.type === "step") {
          return (
            <div key={i} className="prompt-step">
              <span className="prompt-step-num">{el.num}</span>
              <span>{el.text}</span>
            </div>
          );
        }
        return (
          <div key={i} className="prompt-sub">
            <span style={{ color: "var(--muted-foreground)", marginRight: 4 }}>→</span>
            {el.text}
          </div>
        );
      })}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
function TrendDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 5l4 4 3-3 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M14.5 1.5L6.5 9.5M14.5 1.5L10 14.5L6.5 9.5M14.5 1.5L1.5 6L6.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SendCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Sub-components ─────────────────────────────────────── */
function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}
