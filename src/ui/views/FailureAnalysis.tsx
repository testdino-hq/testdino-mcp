import { useState } from "react";
import type { ViewType } from "../App";

interface FailureAnalysisProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function FailureAnalysis({ data, navigate }: FailureAnalysisProps) {
  const projectId = data.projectId as string;
  const debugData = data.debugData as any;
  const testcaseName = data.testcaseName as string;
  const [activeTab, setActiveTab] = useState<"summary" | "history" | "errors">("summary");

  // Extract debug info
  const history = debugData?.history || debugData?.testRuns || [];
  const errorCategories = debugData?.errorCategories || debugData?.error_categories || [];
  const commonErrors = debugData?.commonErrors || debugData?.common_errors || [];
  const debugPrompt = debugData?.debugging_prompt || debugData?.debuggingPrompt || "";

  const failureCount = history.filter((h: any) => h.status === "failed").length;
  const totalCount = history.length;
  const failureRate = totalCount > 0 ? Math.round((failureCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Failure Analysis</span>
      </div>

      <h2 className="section-title" style={{ marginBottom: 16 }}>
        {testcaseName || "Failure Analysis"}
      </h2>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card failed">
          <div className="stat-value">{failureRate}%</div>
          <div className="stat-label">Failure Rate</div>
        </div>
        <div className="stat-card total">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Total Runs</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-value">{failureCount}</div>
          <div className="stat-label">Failures</div>
        </div>
        <div className="stat-card passed">
          <div className="stat-value">{totalCount - failureCount}</div>
          <div className="stat-label">Passes</div>
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
          {/* Error categories */}
          {errorCategories.length > 0 && (
            <div className="section">
              <h3 className="section-title">Error Categories</h3>
              <div className="stats-bar">
                {errorCategories.map((cat: any, i: number) => (
                  <div key={i} className="stat-card failed">
                    <div className="stat-value">{cat.count || cat.occurrences || "—"}</div>
                    <div className="stat-label">{cat.category || cat.name || `Category ${i + 1}`}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug prompt */}
          {debugPrompt && (
            <div className="section">
              <h3 className="section-title">AI Debugging Suggestion</h3>
              <div className="detail-panel">
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{debugPrompt}</div>
              </div>
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
                  <DetailRow label="Error" value={err.message || err.error || err.errorMessage} />
                  <DetailRow label="Occurrences" value={String(err.count || err.occurrences || "")} />
                  <DetailRow label="Category" value={err.category} />
                  {(err.stackTrace || err.stack) && (
                    <div style={{ marginTop: 8 }}>
                      <div className="detail-label" style={{ marginBottom: 4 }}>Stack Trace</div>
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
                    <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.errorMessage || h.error || "—"}
                    </td>
                    <td>{formatDate(h.date || h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}
