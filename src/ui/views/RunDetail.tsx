import { useState, useCallback } from "react";
import type { ViewType } from "../App";

interface RunDetailProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function RunDetail({ data, navigate, callTool }: RunDetailProps) {
  const projectId = data.projectId as string;
  const runDetails = data.runDetails as any;
  const [activeTab, setActiveTab] = useState<"overview" | "cases">("overview");
  const [testcases, setTestcases] = useState<any[] | null>(null);
  const [loadingCases, setLoadingCases] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  // Extract run info - handle both single object and array
  const run = Array.isArray(runDetails) ? runDetails[0] : runDetails;
  const stats = run?.statistics || run?.stats || run;

  const handleLoadCases = useCallback(async () => {
    setLoadingCases(true);
    const runId = run?._id || run?.id || data.runId;
    const args: Record<string, unknown> = { projectId };
    if (runId) args.by_testrun_id = runId;
    if (run?.counter) args.counter = run.counter;
    if (statusFilter) args.by_status = statusFilter;

    const result = await callTool("ui_fetch_testcases", args);
    if (result?.testcases) {
      setTestcases(result.testcases as any[]);
    }
    setLoadingCases(false);
  }, [projectId, run, statusFilter, callTool, data.runId]);

  const handleDebugCase = useCallback(
    async (testcaseName: string) => {
      const result = await callTool("ui_fetch_debug", {
        projectId,
        testcase_name: testcaseName,
      });
      if (result) {
        navigate("failures", { projectId, debugData: result.debugData, testcaseName });
      }
    },
    [projectId, callTool, navigate],
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Run #{run?.counter || run?.id || "Detail"}</span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === "cases" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("cases");
            if (!testcases) handleLoadCases();
          }}
        >
          Test Cases
        </button>
      </div>

      {activeTab === "overview" && (
        <div>
          {/* Stats */}
          <div className="stats-bar">
            <div className="stat-card passed">
              <div className="stat-value">{stats?.passed ?? stats?.totalPassed ?? "—"}</div>
              <div className="stat-label">Passed</div>
            </div>
            <div className="stat-card failed">
              <div className="stat-value">{stats?.failed ?? stats?.totalFailed ?? "—"}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat-card skipped">
              <div className="stat-value">{stats?.skipped ?? stats?.totalSkipped ?? "—"}</div>
              <div className="stat-label">Skipped</div>
            </div>
            <div className="stat-card flaky">
              <div className="stat-value">{stats?.flaky ?? stats?.totalFlaky ?? "—"}</div>
              <div className="stat-label">Flaky</div>
            </div>
          </div>

          {/* Details panel */}
          <div className="detail-panel">
            <DetailRow label="Branch" value={run?.branch || run?.branchName} />
            <DetailRow label="Commit" value={run?.commit || run?.commitSha} />
            <DetailRow label="Author" value={run?.author || run?.authorName} />
            <DetailRow label="Environment" value={run?.environment} />
            <DetailRow label="Duration" value={formatDuration(run?.duration || run?.totalDuration)} />
            <DetailRow label="Started" value={formatDate(run?.createdAt || run?.startedAt)} />
            <DetailRow label="Status" value={run?.status} badge />
          </div>

          {/* Suites if available */}
          {run?.suites && run.suites.length > 0 && (
            <div className="section">
              <h3 className="section-title">Test Suites</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Suite</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {run.suites.map((suite: any, i: number) => (
                    <tr key={i}>
                      <td>{suite.name || suite.title || suite.specFile || `Suite ${i + 1}`}</td>
                      <td style={{ color: "#16a34a" }}>{suite.passed ?? "—"}</td>
                      <td style={{ color: "#dc2626" }}>{suite.failed ?? "—"}</td>
                      <td>{suite.total ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "cases" && (
        <div>
          <div className="filters-bar">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
              <option value="flaky">Flaky</option>
            </select>
            <button className="btn btn-sm" onClick={handleLoadCases} disabled={loadingCases}>
              {loadingCases ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingCases && (
            <div className="loading">
              <div className="spinner" />
              Loading test cases...
            </div>
          )}

          {testcases && testcases.length === 0 && <div className="empty-state">No test cases found.</div>}

          {testcases && testcases.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Test Case</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testcases.map((tc: any, i: number) => (
                  <tr key={tc._id || tc.id || i}>
                    <td>{tc.title || tc.name || tc.testcaseName || `Test ${i + 1}`}</td>
                    <td>
                      <span className={`badge badge-${tc.status}`}>{tc.status}</span>
                    </td>
                    <td>{formatDuration(tc.duration)}</td>
                    <td>
                      {(tc.status === "failed" || tc.status === "flaky") && (
                        <button
                          className="btn btn-sm"
                          onClick={() => handleDebugCase(tc.title || tc.name || tc.testcaseName)}
                        >
                          Debug
                        </button>
                      )}
                    </td>
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

function DetailRow({ label, value, badge }: { label: string; value?: string; badge?: boolean }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div className="detail-value">
        {badge ? <span className={`badge badge-${value}`}>{value}</span> : value}
      </div>
    </div>
  );
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}
