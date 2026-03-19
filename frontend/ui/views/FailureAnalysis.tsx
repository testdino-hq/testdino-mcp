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
  const [collapsedErrors, setCollapsedErrors] = useState<Set<number>>(new Set());

  const history         = debugData?.history         || debugData?.testRuns        || [];
  const errorCategories = debugData?.errorCategories || debugData?.error_categories || [];

  const failureCount = history.filter((h: any) => h.status === "failed").length;
  const totalCount   = history.length;
  const failureRate  = totalCount > 0 ? Math.round((failureCount / totalCount) * 100) : 0;

  // Extract the primary error message — first line only to avoid appended browser logs.
  function getErrorMsg(h: any): string {
    let msg = "";
    if (h.error?.message) msg = h.error.message;
    else if (typeof h.error === "string" && h.error) msg = h.error;
    else if (h.errorMessage) msg = h.errorMessage;
    else if (Array.isArray(h.allErrors) && h.allErrors.length > 0) {
      const first = h.allErrors[0];
      msg = first?.message || (typeof first === "string" ? first : "") || "";
    } else if (Array.isArray(h.attempts) && h.attempts.length > 0) {
      const a = h.attempts[h.attempts.length - 1];
      msg = a?.error?.message || (typeof a?.error === "string" ? a.error : "") || "";
    }
    return msg.split("\n")[0].trim();
  }
  function getStack(h: any): string {
    if (h.error?.stack) return h.error.stack;
    if (h.stackTrace) return h.stackTrace;
    if (h.stack) return h.stack;
    if (Array.isArray(h.allErrors) && h.allErrors[0]?.stack) return h.allErrors[0].stack;
    return "";
  }
  function cleanStack(raw: string): string {
    if (!raw) return "";
    const lines = raw.split("\n").filter(line => {
      const t = line.trim();
      return t !== "" &&
        t !== "Browser logs:" &&
        t !== "Call log:" &&
        !t.startsWith("<launching>") &&
        !t.startsWith("<launched>") &&
        !t.startsWith("[pid=") &&
        !t.startsWith("--") &&
        !/^-\s+\[pid=/.test(t) &&
        !/^-\s+</.test(t);
    });
    const result = lines.join("\n").trim();
    return result.length > 1500 ? result.slice(0, 1500) + "\n...(truncated)" : result;
  }

  // Derive error patterns from history — one pattern per unique error message.
  const commonErrors = (() => {
    const errorMap = new Map<string, { message: string; stack: string; count: number; category: string }>();
    for (const h of history) {
      if (h.status !== "failed" && h.status !== "flaky") continue;
      const msg = getErrorMsg(h);
      if (!msg) continue;
      const key = msg.slice(0, 120);
      const existing = errorMap.get(key);
      if (existing) existing.count++;
      else errorMap.set(key, { message: msg, stack: cleanStack(getStack(h)), count: 1, category: h.errorCategory || h.category || "—" });
    }
    return Array.from(errorMap.values()).sort((a, b) => b.count - a.count);
  })();

  // Build a contextual prompt using correct field paths from the API.
  const contextualPrompt = (() => {
    const lastFailure = [...history].reverse().find((h: any) => h.status === "failed" || h.status === "flaky");
    if (!lastFailure) return "";
    const error  = getErrorMsg(lastFailure);
    const stack  = cleanStack(getStack(lastFailure));
    const file   = lastFailure.testSuite?.filePath || lastFailure.testSuite?.fileName || "";
    const branch = lastFailure.testRun?.branch || lastFailure.branch || "";
    const env    = lastFailure.testRun?.environment || lastFailure.environment || "";
    const author = lastFailure.testRun?.author || "";
    const commit = lastFailure.testRun?.commit || "";
    const failureRate = totalCount > 0 ? Math.round((history.filter((h: any) => h.status === "failed" || h.status === "flaky").length / totalCount) * 100) : 0;

    const lines: string[] = [];
    lines.push(`I have a failing automated test that needs to be fixed.`, ``);
    lines.push(`Test case: "${testcaseName}"`);
    if (file)   lines.push(`Test file: ${file}`);
    if (branch) lines.push(`Branch: ${branch}`);
    if (env)    lines.push(`Environment: ${env}`);
    if (author) lines.push(`Author: ${author}`);
    if (commit) lines.push(`Commit: ${commit}`);
    lines.push(`Failure rate: ${failureRate}% (${history.filter((h: any) => h.status === "failed" || h.status === "flaky").length} of ${totalCount} runs)`);
    if (error) {
      lines.push(``, `Error:`, error);
    }
    if (stack && stack !== error) {
      lines.push(``, `Stack trace:`, stack);
    }
    lines.push(``);
    lines.push(`1) What is the root cause of this specific failure?`);
    lines.push(`2) What is the fix?`);
    return lines.join("\n");
  })();

  const handleSendToChat = useCallback(async () => {
    if (!contextualPrompt || sending) return;
    setSending(true);
    try {
      await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: contextualPrompt }],
      });
      setSent(true);
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  }, [app, contextualPrompt, sending]);

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

          {contextualPrompt && (
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
              <FormattedPrompt text={contextualPrompt} />
            </div>
          )}
        </div>
      )}

      {activeTab === "errors" && (
        <div>
          {commonErrors.length === 0 ? (
            <div className="empty-state">No error patterns found.</div>
          ) : (
            commonErrors.map((err: any, i: number) => {
              const isOpen = !collapsedErrors.has(i);
              const toggle = () => setCollapsedErrors(prev => {
                const next = new Set(prev);
                next.has(i) ? next.delete(i) : next.add(i);
                return next;
              });
              return (
                <div key={i} className="error-accordion">
                  <div className="error-accordion-header" onClick={toggle}>
                    <span className="error-accordion-chevron">{isOpen ? "∧" : "∨"}</span>
                    <span className="error-accordion-title">Error Details</span>
                  </div>
                  {isOpen && (
                    <div className="error-accordion-body">
                      {err.message && (
                        <div className="error-accordion-message">{err.message}</div>
                      )}
                      {err.stack && err.stack.trim() !== err.message?.trim() && (
                        <div className="error-accordion-stack">{err.stack}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
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

/* ── Helpers ────────────────────────────────────────────── */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}
