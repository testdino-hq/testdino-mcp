import type { ViewType } from "../App";

interface ManualTestCasesProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function ManualTestCases({ data }: ManualTestCasesProps) {
  const manualCases = (data.manualCases as any[]) || [];
  const projectId = data.projectId as string;

  return (
    <div>
      <div className="breadcrumb">
        <span>Manual Test Cases — {projectId}</span>
      </div>

      {manualCases.length === 0 ? (
        <div className="empty-state">No manual test cases found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Type</th>
              <th>Automation</th>
            </tr>
          </thead>
          <tbody>
            {manualCases.map((tc: any, i: number) => (
              <tr key={tc._id || tc.id || i}>
                <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
                  {tc.caseId || tc.humanId || `TC-${i + 1}`}
                </td>
                <td>{tc.title || tc.name}</td>
                <td>
                  {tc.priority && (
                    <span className={`badge badge-${tc.priority}`}>{tc.priority}</span>
                  )}
                </td>
                <td>
                  {tc.status && (
                    <span className={`badge badge-${tc.status === "actual" ? "passed" : tc.status === "deprecated" ? "failed" : "skipped"}`}>
                      {tc.status}
                    </span>
                  )}
                </td>
                <td>{tc.type || "—"}</td>
                <td>{tc.automationStatus || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
