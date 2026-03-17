import { useState, useCallback, useEffect } from "react";
import type { ViewType } from "../App";
import { Pagination, PAGE_SIZE } from "../components/Pagination";

interface RunDetailProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function RunDetail({ data, navigate, callTool }: RunDetailProps) {
  const projectId  = data.projectId as string;
  const runDetails = data.runDetails as any;
  const run        = Array.isArray(runDetails) ? runDetails[0] : runDetails;

  const [testcases,    setTestcases]    = useState<any[] | null>(null);
  const [loadingCases, setLoadingCases] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [casesPage,    setCasesPage]    = useState(0);

  const loadCases = useCallback(async (status?: string) => {
    setLoadingCases(true);
    setCasesPage(0);
    const runId = run?._id || run?.id || data.runId;
    const args: Record<string, unknown> = { projectId };
    if (runId)        args.by_testrun_id = runId;
    if (run?.counter) args.counter       = run.counter;
    if (status)       args.by_status     = status;
    const result = await callTool("show_testdino", { _action: "fetch_testcases", ...args });
    if (result?.testcases) setTestcases(result.testcases as any[]);
    setLoadingCases(false);
  }, [projectId, run, callTool, data.runId]);

  useEffect(() => { loadCases(); }, []);

  const handleStatusChange = (s: string) => {
    setStatusFilter(s);
    loadCases(s);
  };

  const handleDebugCase = useCallback(async (testcaseName: string) => {
    const result = await callTool("show_testdino", {
      _action: "fetch_debug",
      projectId,
      testcase_name: testcaseName,
    });
    if (result) navigate("failures", { projectId, debugData: result.debugData, testcaseName });
  }, [projectId, callTool, navigate]);

  const pageCases = testcases ? testcases.slice(casesPage * PAGE_SIZE, (casesPage + 1) * PAGE_SIZE) : [];

  return (
    <div className="view-fade-in">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Run #{run?.counter || run?.id || "Detail"}</span>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card passed">
          <div className="stat-card-header">
            <div className="stat-label">Passed</div>
            <div className="stat-card-icon"><CheckIcon /></div>
          </div>
          <div className="stat-value">{run?.passed ?? run?.testStats?.passed ?? "—"}</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-card-header">
            <div className="stat-label">Failed</div>
            <div className="stat-card-icon"><XIcon /></div>
          </div>
          <div className="stat-value">{run?.failed ?? run?.testStats?.failed ?? "—"}</div>
        </div>
        <div className="stat-card skipped">
          <div className="stat-card-header">
            <div className="stat-label">Skipped</div>
            <div className="stat-card-icon"><SkipIcon /></div>
          </div>
          <div className="stat-value">{run?.skipped ?? run?.testStats?.skipped ?? "—"}</div>
        </div>
        <div className="stat-card flaky">
          <div className="stat-card-header">
            <div className="stat-label">Flaky</div>
            <div className="stat-card-icon"><ZapIcon /></div>
          </div>
          <div className="stat-value">{run?.flaky ?? run?.testStats?.flaky ?? "—"}</div>
        </div>
        <div className="stat-card total">
          <div className="stat-card-header">
            <div className="stat-label">Total</div>
            <div className="stat-card-icon"><ListIcon /></div>
          </div>
          <div className="stat-value">{run?.total ?? run?.testStats?.total ?? "—"}</div>
        </div>
      </div>

      {/* Details panel */}
      <div className="detail-panel" style={{ marginBottom: 20 }}>
        <DetailRow label="Status"   value={run?.status} badge />
        <DetailRow label="Branch"   value={run?.branch   || run?.metadata?.git?.branch} />
        <DetailRow label="Commit"   value={run?.commit   || run?.metadata?.git?.commit?.hash} />
        <DetailRow label="Author"   value={run?.author   || run?.metadata?.git?.commit?.author} />
        <DetailRow label="Duration" value={formatDuration(run?.duration)} />
        <DetailRow label="Started"  value={formatDate(run?.startTime || run?.createdAt)} />
      </div>

      {/* Test Cases */}
      <div className="section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Test Cases</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              className="filters-bar-select"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
              <option value="flaky">Flaky</option>
            </select>
            <button className="btn btn-sm" onClick={() => loadCases(statusFilter)} disabled={loadingCases}>
              {loadingCases ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {loadingCases && (
          <div className="loading">
            <div className="spinner" />
            Loading test cases...
          </div>
        )}

        {!loadingCases && testcases && testcases.length === 0 && (
          <div className="empty-state">No test cases found.</div>
        )}

        {!loadingCases && testcases && testcases.length > 0 && (
          <>
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
                {pageCases.map((tc: any, i: number) => (
                  <tr key={tc._id || tc.id || i}>
                    <td>{tc.title || tc.name || tc.testcaseName || `Test ${casesPage * PAGE_SIZE + i + 1}`}</td>
                    <td>
                      <span className={`badge badge-${tc.status}`}>{tc.status}</span>
                    </td>
                    <td style={{ color: "var(--muted-foreground)" }}>{formatDuration(tc.duration)}</td>
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
            <Pagination page={casesPage} total={testcases.length} onChange={setCasesPage} />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
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
function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 4.5l5 3.5-5 3.5V4.5zM10 4.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Sub-components ─────────────────────────────────────── */
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

/* ── Helpers ────────────────────────────────────────────── */
function formatDuration(ms: number | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs    = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleString(); }
  catch { return dateStr; }
}
