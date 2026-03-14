import { useState, useCallback } from "react";
import type { ViewType } from "../App";

interface DashboardProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function Dashboard({ data, navigate, callTool }: DashboardProps) {
  const testruns = (data.testruns as any[]) || [];
  const projectId = data.projectId as string;
  const filters = (data.filters as Record<string, string>) || {};

  const [branch, setBranch] = useState(filters.branch || "");
  const [timeInterval, setTimeInterval] = useState(filters.timeInterval || "");
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState(testruns);

  // Compute summary stats
  const totalRuns = runs.length;
  const totalPassed = runs.reduce((sum: number, r: any) => sum + (r.passed || r.totalPassed || 0), 0);
  const totalFailed = runs.reduce((sum: number, r: any) => sum + (r.failed || r.totalFailed || 0), 0);
  const totalSkipped = runs.reduce((sum: number, r: any) => sum + (r.skipped || r.totalSkipped || 0), 0);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const args: Record<string, unknown> = { projectId };
    if (branch) args.by_branch = branch;
    if (timeInterval) args.by_time_interval = timeInterval;

    const result = await callTool("ui_fetch_testruns", args);
    if (result?.testruns) {
      setRuns(result.testruns as any[]);
    }
    setLoading(false);
  }, [projectId, branch, timeInterval, callTool]);

  const handleRunClick = useCallback(
    async (run: any) => {
      const runId = run._id || run.id;
      const result = await callTool("ui_fetch_run_details", {
        projectId,
        testrun_id: runId,
      });
      if (result) {
        navigate("run-detail", { projectId, runDetails: result.runDetails, runId });
      }
    },
    [projectId, callTool, navigate],
  );

  return (
    <div>
      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card total">
          <div className="stat-value">{totalRuns}</div>
          <div className="stat-label">Test Runs</div>
        </div>
        <div className="stat-card passed">
          <div className="stat-value">{totalPassed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-value">{totalFailed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card skipped">
          <div className="stat-value">{totalSkipped}</div>
          <div className="stat-label">Skipped</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Branch..."
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
        <select value={timeInterval} onChange={(e) => setTimeInterval(e.target.value)}>
          <option value="">All time</option>
          <option value="1d">Last 24h</option>
          <option value="3d">Last 3 days</option>
          <option value="weekly">This week</option>
          <option value="monthly">This month</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleRefresh} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Table */}
      {runs.length === 0 ? (
        <div className="empty-state">No test runs found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Skipped</th>
              <th>Duration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run: any, i: number) => (
              <tr
                key={run._id || run.id || i}
                className="clickable"
                onClick={() => handleRunClick(run)}
              >
                <td>{run.counter ?? i + 1}</td>
                <td>{run.branch || run.branchName || "—"}</td>
                <td>
                  <span className={`badge badge-${run.status || "completed"}`}>
                    {run.status || "completed"}
                  </span>
                </td>
                <td style={{ color: "#16a34a" }}>{run.passed ?? run.totalPassed ?? "—"}</td>
                <td style={{ color: "#dc2626" }}>{run.failed ?? run.totalFailed ?? "—"}</td>
                <td style={{ color: "#d97706" }}>{run.skipped ?? run.totalSkipped ?? "—"}</td>
                <td>{formatDuration(run.duration || run.totalDuration)}</td>
                <td>{formatDate(run.createdAt || run.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}
