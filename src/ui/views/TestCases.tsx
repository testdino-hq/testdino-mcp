import type { ViewType } from "../App";

interface TestCasesProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function TestCases({ data, navigate, callTool }: TestCasesProps) {
  const projectId = data.projectId as string;
  const testcases = (data.testcases as any[]) || [];

  const handleDebug = async (name: string) => {
    const result = await callTool("ui_fetch_debug", { projectId, testcase_name: name });
    if (result) {
      navigate("failures", { projectId, debugData: result.debugData, testcaseName: name });
    }
  };

  return (
    <div>
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Test Cases</span>
      </div>

      {testcases.length === 0 ? (
        <div className="empty-state">No test cases found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Test Case</th>
              <th>Status</th>
              <th>Spec File</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {testcases.map((tc: any, i: number) => (
              <tr key={tc._id || tc.id || i}>
                <td>{tc.title || tc.name || tc.testcaseName}</td>
                <td>
                  <span className={`badge badge-${tc.status}`}>{tc.status}</span>
                </td>
                <td style={{ fontSize: 12, color: "#64748b" }}>{tc.specFile || tc.spec_file || "—"}</td>
                <td>{tc.duration ? `${Math.round(tc.duration / 1000)}s` : "—"}</td>
                <td>
                  {(tc.status === "failed" || tc.status === "flaky") && (
                    <button className="btn btn-sm" onClick={() => handleDebug(tc.title || tc.name || tc.testcaseName)}>
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
  );
}
