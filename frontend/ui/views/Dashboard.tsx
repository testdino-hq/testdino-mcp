import { useState, useCallback, useEffect, useRef } from "react";
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
  const [, setLoading] = useState(false);
  const [runs, setRuns] = useState(testruns);
  const [page, setPage] = useState(0);
  const initialMount = useRef(true);

  useEffect(() => { setPage(0); }, [runs]);

  const totalRuns   = runs.length;
  const totalPassed = runs.reduce((s: number, r: any) => s + (r.testStats?.passed ?? r.passed ?? 0), 0);
  const totalFailed = runs.reduce((s: number, r: any) => s + (r.testStats?.failed ?? r.failed ?? 0), 0);
  const totalFlaky   = runs.reduce((s: number, r: any) => s + (r.testStats?.flaky   ?? r.flaky   ?? 0), 0);
  const totalSkipped = runs.reduce((s: number, r: any) => s + (r.testStats?.skipped ?? r.skipped ?? 0), 0);
  const totalTests   = runs.reduce((s: number, r: any) => s + (r.testStats?.total   ?? r.total   ?? 0), 0);
  const passRate    = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  const passRateColor =
    passRate >= 80 ? "var(--passed)" :
    passRate >= 50 ? "var(--flaky)"  : "var(--failed)";

  const fetchRuns = useCallback(async (b: string, t: string) => {
    setLoading(true);
    const args: Record<string, unknown> = { projectId };
    if (b) args.by_branch        = b;
    if (t) args.by_time_interval = t;
    const result = await callTool("show_testdino", { _action: "fetch_testruns", ...args });
    if (result?.testruns) setRuns(result.testruns as any[]);
    setLoading(false);
  }, [projectId, callTool]);

  // Auto-fetch on filter changes (debounce branch input, immediate for select)
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    const timer = setTimeout(() => { fetchRuns(branch, timeInterval); }, 400);
    return () => clearTimeout(timer);
  }, [branch, timeInterval, fetchRuns]);

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
          <div className="stat-label">Total Runs</div>
          <div className="stat-value">{totalRuns}</div>
        </div>
        <div className="stat-card passed">
          <div className="stat-label">Passed</div>
          <div className="stat-value">{totalPassed}</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-label">Failed</div>
          <div className="stat-value">{totalFailed}</div>
        </div>
        <div className="stat-card flaky">
          <div className="stat-label">Flaky</div>
          <div className="stat-value">{totalFlaky}</div>
        </div>
        <div className="stat-card skipped">
          <div className="stat-label">Skipped</div>
          <div className="stat-value">{totalSkipped}</div>
        </div>
        <div className="stat-card total">
          <div className="stat-label">Pass Rate</div>
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
          style={{ flex: 1, minWidth: 0, maxWidth: 220 }}
        />
        <select value={timeInterval} onChange={(e) => setTimeInterval(e.target.value)}>
          <option value="">All time</option>
          <option value="1d">Last 24h</option>
          <option value="3d">Last 3 days</option>
          <option value="weekly">This week</option>
          <option value="monthly">This month</option>
        </select>
      </div>

      {/* Table */}
      {runs.length === 0 ? (
        <div className="empty-state">No test runs found for this project.</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Branch</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Results</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {pageRuns.map((run: any, i: number) => {
                  const stats   = run.testStats || {};
                  const isRerun = run.rerunMetadata?.isRerun;
                  const p = stats.passed ?? run.passed ?? 0;
                  const f = stats.failed ?? run.failed ?? 0;
                  const fl = stats.flaky ?? run.flaky ?? 0;
                  const t = stats.total ?? run.total ?? 0;
                  return (
                    <tr key={run._id || i} className="clickable" onClick={() => handleRunClick(run)}>
                      <td>
                        <div>
                          <span style={{ fontWeight: 600 }}>
                            #{run.counter ?? page * PAGE_SIZE + i + 1}
                          </span>
                          {isRerun && (
                            <span className="badge badge-skipped" style={{ marginLeft: 4 }}>
                              Rerun
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                          <ClockIcon />
                          {formatDuration(run.duration)}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <BranchIcon />
                          {run.branch || "—"}
                        </span>
                      </td>
                      <td style={{ color: "var(--muted-foreground)" }}>{run.author || "—"}</td>
                      <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                      <td>
                        <div className="inline-stats">
                          <span className="inline-stat passed">{p}</span>
                          <span className="inline-stat failed">{f}</span>
                          <span className="inline-stat flaky">{fl}</span>
                          <span className="inline-stat skipped">{stats.skipped ?? run.skipped ?? 0}</span>
                        </div>
                        <div className="inline-stats-total">Total: {t}</div>
                      </td>
                      <td style={{ color: "var(--muted-foreground)" }}>{formatDate(run.startTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
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
