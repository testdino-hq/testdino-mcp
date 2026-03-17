import { useState, useCallback, useEffect } from "react";
import type { ViewType } from "../App";
import { Pagination, PAGE_SIZE } from "../components/Pagination";

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
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [runs]);

  const totalRuns   = runs.length;
  const totalPassed = runs.reduce((s: number, r: any) => s + (r.testStats?.passed ?? r.passed ?? 0), 0);
  const totalFailed = runs.reduce((s: number, r: any) => s + (r.testStats?.failed ?? r.failed ?? 0), 0);
  const totalFlaky  = runs.reduce((s: number, r: any) => s + (r.testStats?.flaky  ?? r.flaky  ?? 0), 0);
  const totalTests  = runs.reduce((s: number, r: any) => s + (r.testStats?.total  ?? r.total  ?? 0), 0);
  const passRate    = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  const passRateColor =
    passRate >= 80 ? "var(--passed)" :
    passRate >= 50 ? "var(--flaky)"  : "var(--failed)";

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const args: Record<string, unknown> = { projectId };
    if (branch)       args.by_branch        = branch;
    if (timeInterval) args.by_time_interval = timeInterval;
    const result = await callTool("show_testdino", { _action: "fetch_testruns", ...args });
    if (result?.testruns) setRuns(result.testruns as any[]);
    setLoading(false);
  }, [projectId, branch, timeInterval, callTool]);

  const handleRunClick = useCallback(async (run: any) => {
    const result = await callTool("show_testdino", { _action: "fetch_run_details", projectId, testrun_id: run._id });
    if (result) navigate("run-detail", { projectId, runDetails: result.runDetails, runId: run._id });
  }, [projectId, callTool, navigate]);

  const pageRuns = runs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="view-fade-in">
      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card total">
          <div className="stat-card-header">
            <div className="stat-label">Total Runs</div>
            <div className="stat-card-icon"><ListIcon /></div>
          </div>
          <div className="stat-value">{totalRuns}</div>
        </div>
        <div className="stat-card passed">
          <div className="stat-card-header">
            <div className="stat-label">Passed</div>
            <div className="stat-card-icon"><CheckIcon /></div>
          </div>
          <div className="stat-value">{totalPassed}</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-card-header">
            <div className="stat-label">Failed</div>
            <div className="stat-card-icon"><XIcon /></div>
          </div>
          <div className="stat-value">{totalFailed}</div>
        </div>
        <div className="stat-card flaky">
          <div className="stat-card-header">
            <div className="stat-label">Flaky</div>
            <div className="stat-card-icon"><ZapIcon /></div>
          </div>
          <div className="stat-value">{totalFlaky}</div>
        </div>
        <div className="stat-card total">
          <div className="stat-card-header">
            <div className="stat-label">Pass Rate</div>
            <div className="stat-card-icon"><TrendIcon /></div>
          </div>
          <div className="stat-value" style={{ color: passRateColor }}>{passRate}%</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Filter by branch..."
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          style={{ minWidth: 180 }}
        />
        <select value={timeInterval} onChange={(e) => setTimeInterval(e.target.value)}>
          <option value="">All time</option>
          <option value="1d">Last 24h</option>
          <option value="3d">Last 3 days</option>
          <option value="weekly">This week</option>
          <option value="monthly">This month</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleRefresh} disabled={loading}>
          {loading ? "Loading..." : "Apply"}
        </button>
      </div>

      {/* Table */}
      {runs.length === 0 ? (
        <div className="empty-state">No test runs found for this project.</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Branch</th>
                <th>Author</th>
                <th>Status</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Flaky</th>
                <th>Total</th>
                <th>Duration</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {pageRuns.map((run: any, i: number) => {
                const stats   = run.testStats || {};
                const isRerun = run.rerunMetadata?.isRerun;
                return (
                  <tr key={run._id || i} className="clickable" onClick={() => handleRunClick(run)}>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                        #{run.counter ?? page * PAGE_SIZE + i + 1}
                      </span>
                      {isRerun && (
                        <span className="badge badge-skipped" style={{ marginLeft: 6, fontSize: 10 }}>
                          Rerun
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <BranchIcon />
                        {run.branch || "—"}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted-foreground)" }}>{run.author || "—"}</td>
                    <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                    <td style={{ color: "var(--passed)", fontWeight: 600 }}>
                      {stats.passed ?? run.passed ?? "—"}
                    </td>
                    <td style={{ color: "var(--failed)", fontWeight: 600 }}>
                      {stats.failed ?? run.failed ?? "—"}
                    </td>
                    <td style={{ color: "var(--flaky)", fontWeight: 600 }}>
                      {stats.flaky ?? run.flaky ?? "—"}
                    </td>
                    <td style={{ color: "var(--muted-foreground)" }}>
                      {stats.total ?? run.total ?? "—"}
                    </td>
                    <td style={{ color: "var(--muted-foreground)" }}>{formatDuration(run.duration)}</td>
                    <td style={{ color: "var(--muted-foreground)" }}>{formatDate(run.startTime)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={page} total={runs.length} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
function BranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
      style={{ flexShrink: 0, color: "var(--muted-foreground)" }}>
      <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 9.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm8-9.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4.25 4v8M12.25 4v1.5a3 3 0 0 1-3 3H7"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M9.5 2L3 9h5l-1.5 5L14 7H9L9.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 11l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

/* ── Helpers ────────────────────────────────────────────── */
function formatDuration(ms: number | undefined): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m   = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}
