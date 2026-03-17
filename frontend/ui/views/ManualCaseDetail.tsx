import type { ViewType } from "../App";

interface ManualCaseDetailProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function ManualCaseDetail({ data, navigate }: ManualCaseDetailProps) {
  const projectId = data.projectId as string;
  const tc        = (data.testcase as any) || {};

  const title = tc.title || tc.name || "Manual Test Case";
  const steps = Array.isArray(tc.steps) ? tc.steps : [];

  return (
    <div className="view-fade-in">
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span>Manual Case Detail</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          {tc.caseId && (
            <span className="mono-tag">{tc.caseId || tc.humanId}</span>
          )}
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
            {title}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tc.status && (
            <span className={`badge badge-${tc.status === "actual" ? "passed" : tc.status === "deprecated" ? "failed" : "draft"}`}>
              {tc.status}
            </span>
          )}
          {tc.priority     && <span className={`badge badge-${tc.priority}`}>{tc.priority}</span>}
          {tc.severity     && <span className="badge badge-skipped">{tc.severity}</span>}
          {tc.type         && <span className="badge badge-running">{tc.type}</span>}
          {tc.layer        && <span className="badge badge-draft">{tc.layer}</span>}
          {tc.automationStatus && <span className="badge badge-draft">{tc.automationStatus}</span>}
        </div>
      </div>

      {/* Metadata panel */}
      <div className="detail-panel" style={{ marginBottom: 16 }}>
        {tc.description   && <DetailRow label="Description"   value={tc.description} />}
        {tc.preconditions && <DetailRow label="Preconditions" value={tc.preconditions} />}
        {tc.postconditions && <DetailRow label="Postconditions" value={tc.postconditions} />}
        {tc.behavior      && <DetailRow label="Behavior"      value={tc.behavior} />}
        {tc.tags          && (
          <DetailRow label="Tags" value={Array.isArray(tc.tags) ? tc.tags.join(", ") : tc.tags} />
        )}
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="section">
          <div className="section-title">Test Steps</div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Action</th>
                <th>Expected Result</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step: any, i: number) => (
                <tr key={i}>
                  <td style={{ color: "var(--muted-foreground)" }}>{i + 1}</td>
                  <td>{step.action}</td>
                  <td style={{ color: "var(--muted-foreground)" }}>{step.expectedResult || "—"}</td>
                  <td style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "monospace" }}>
                    {step.data || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
