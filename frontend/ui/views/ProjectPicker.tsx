import { useState } from "react";
import type { ViewType } from "../App";

interface Org {
  organizationId: string;
  organizationName: string;
  projects: Array<{
    projectId: string;
    projectName: string;
    modules: { testRuns: boolean; manualTestCases: boolean };
    permissions: { role: string };
  }>;
}

interface ProjectPickerProps {
  data: Record<string, unknown>;
  navigate: (view: ViewType, data?: Record<string, unknown>) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}

export function ProjectPicker({ data, navigate, callTool }: ProjectPickerProps) {
  const orgs = (data.orgs as Org[]) || [];
  const [search,     setSearch]    = useState("");
  const [loadingId,  setLoadingId] = useState<string | null>(null);

  const handleSelectProject = async (projectId: string) => {
    setLoadingId(projectId);
    const result = await callTool("show_testdino", { _action: "fetch_testruns", projectId });
    if (result) navigate("dashboard", { projectId, testruns: result.testruns ?? [] });
    setLoadingId(null);
  };

  const q = search.toLowerCase();
  const filtered = orgs
    .map((org) => ({
      ...org,
      projects: org.projects.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          org.organizationName.toLowerCase().includes(q),
      ),
    }))
    .filter((org) => org.projects.length > 0);

  return (
    <div className="view-fade-in">
      <div className="page-heading">
        <div className="page-heading-title">Select a Project</div>
        <div className="page-heading-desc">Choose a project to view its test results and analytics.</div>
      </div>

      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search organizations or projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 0, width: "100%" }}
          autoFocus
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {search ? `No projects match "${search}".` : "No projects found."}
        </div>
      ) : (
        filtered.map((org) => (
          <div key={org.organizationId} className="section">
            <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <OrgIcon />
              {org.organizationName}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {org.projects.map((project) => {
                const isLoading = loadingId === project.projectId;
                return (
                  <div
                    key={project.projectId}
                    className={`project-card${isLoading ? " loading" : ""}`}
                    onClick={() => !loadingId && handleSelectProject(project.projectId)}
                  >
                    <div className="project-card-icon">
                      <FolderIcon />
                    </div>
                    <div className="project-card-info">
                      <div className="project-card-name">{project.projectName}</div>
                      <div className="mono-tag" style={{ marginTop: 2 }}>
                        {project.projectId}
                      </div>
                      <div className="project-card-meta">
                        {project.modules.testRuns && (
                          <span className="badge badge-running">Test Runs</span>
                        )}
                        {project.modules.manualTestCases && (
                          <span className="badge badge-passed">Manual Tests</span>
                        )}
                        <span className={`badge badge-${project.permissions.role === "owner" ? "actual" : "draft"}`}>
                          {project.permissions.role}
                        </span>
                      </div>
                    </div>
                    <div className="project-card-arrow">
                      {isLoading ? <div className="spinner" /> : <ChevronIcon />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
function OrgIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
      style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>
      <path d="M1.5 14V5.5l5-4 5 4V14m-10 0h10m-10 0H1m10 0h1M6 14V10h4v4"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none"
      style={{ color: "var(--foreground)" }}>
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5h3.293a1 1 0 0 1 .707.293L7.5 3.793A1 1 0 0 0 8.207 4.086H13.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
      style={{ color: "var(--border)" }}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
