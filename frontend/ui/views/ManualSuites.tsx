import { useState } from "react";
import type { ViewType } from "../App";
import { Pagination, PAGE_SIZE } from "../components/Pagination";

interface ManualSuitesProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function ManualSuites({ data, navigate, callTool }: ManualSuitesProps) {
  const projectId = data.projectId as string;
  const suites    = (data.suites as any[]) || [];
  const [page, setPage] = useState(0);

  const handleDrillDown = async (suiteId: string) => {
    const result = await callTool("show_testdino", { _action: "fetch_manual_testcases", projectId, suiteId });
    if (result) navigate("manual-cases", { projectId, manualCases: result.manualCases });
  };

  const pageSuites = suites.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="view-fade-in">
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Test Suites</span>
      </div>

      <div className="page-heading">
        <div className="page-heading-title">Manual Test Suites</div>
        <div className="page-heading-desc">
          {suites.length} suite{suites.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {suites.length === 0 ? (
        <div className="empty-state">No test suites found.</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Suite Name</th>
                  <th>ID</th>
                  <th>Children</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageSuites.map((suite: any, i: number) => (
                  <tr key={suite._id || suite.id || i}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <SuiteIcon />
                        <span style={{ fontWeight: 500 }}>
                          {suite.name || suite.title || `Suite ${page * PAGE_SIZE + i + 1}`}
                        </span>
                      </div>
                      {suite.description && (
                        <div style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: 2 }}>
                          {suite.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="mono-tag">{suite._id || suite.id || "—"}</span>
                    </td>
                    <td style={{ color: "var(--muted-foreground)" }}>
                      {suite.childCount ?? suite.children?.length ?? suite.casesCount ?? "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleDrillDown(suite._id || suite.id)}
                      >
                        View Cases
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={suites.length} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function SuiteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
      style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>
      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h5.379a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 13.5 6.622V12.5A1.5 1.5 0 0 1 12 14H3.5A1.5 1.5 0 0 1 2 12.5v-9z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}
