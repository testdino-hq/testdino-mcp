import type { ViewType } from "../App";

interface ActionResultProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function ActionResult({ data, navigate }: ActionResultProps) {
  const projectId = data.projectId as string;
  const action    = (data.action as string)  || "completed";
  const item      = (data.item   as string)  || "item";
  const label     = data.label   as string;
  const result    = data.data    as any;

  const createdId = result?._id || result?.id || result?.caseId;

  return (
    <div className="view-fade-in">
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Dashboard
        </span>
        <span className="separator">/</span>
        <span style={{ textTransform: "capitalize" }}>{action}</span>
      </div>

      {/* Success box */}
      <div className="success-box">
        <div className="success-box-icon">
          <CheckIcon />
        </div>
        <div className="success-box-title">
          {item.charAt(0).toUpperCase() + item.slice(1)} {action} successfully
        </div>
        {label && (
          <div className="success-box-label">"{label}"</div>
        )}
        {createdId && (
          <span className="mono-tag">ID: {createdId}</span>
        )}
      </div>

      {/* Result data */}
      {result && Object.keys(result).length > 0 && (
        <div className="detail-panel">
          {Object.entries(result)
            .filter(([k]) => !["__v"].includes(k))
            .map(([k, v]) => (
              <div key={k} className="detail-row">
                <div className="detail-label">{k}</div>
                <div className="detail-value" style={{ fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                </div>
              </div>
            ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={() => navigate("dashboard", { projectId, testruns: [] })}>
          Go to Dashboard
        </button>
        <button className="btn btn-sm" onClick={() => navigate("manual-cases", { projectId, manualCases: [] })}>
          View Manual Cases
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
