/**
 * test_audit — end-to-end TestDino Playwright audit tool. Delegates to
 * get_audit_report / submit_audit_report by action so all three tools share
 * one code path.
 */

import {
  handleGetAuditReport,
  getAuditReportTool,
} from "./get-audit-report.js";
import {
  handleSubmitAuditReport,
  submitAuditReportTool,
} from "./submit-audit-report.js";
import {
  AUDIT_CATEGORY_LIST,
  normalizeMarkdownReport,
  readMarkdownFromPath,
} from "./shared.js";

type TestAuditAction = "analyze" | "list" | "get";

interface TestAuditArgs {
  token?: string;
  projectId: string;
  action: TestAuditAction;
  branch?: string;
  scope?: "testcase" | "feature" | "spec_file" | "suite";
  target?: Record<string, unknown>;
  reportName?: string;
  markdownReportPath?: string;
  score?: number;
  findings?: Array<Record<string, unknown>>;
  recommendations?: string[];
  markdownReport?: string;
  reportId?: string;
  orgId?: string;
  limit?: number;
  page?: number;
  writeMarkdown?: boolean;
  outputPath?: string;
}

export const testAuditTool = {
  name: "test_audit",
  description:
    "Run a TestDino Playwright test quality audit end-to-end. " +
    "action='analyze' without submission fields fetches the server-curated audit prompt + branch signals (top failing, flaky, and slow tests) so you can analyze the repo locally. " +
    "action='analyze' with score + markdown submits the completed audit report. " +
    "action='list' browses past reports; action='get' retrieves one by reportId. " +
    "Trigger only when the user explicitly names TestDino (e.g. 'TestDino audit', 'run a TestDino audit'). Do NOT call for generic 'audit'/'code review' requests.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      action: {
        type: "string",
        enum: ["analyze", "list", "get"],
        description:
          "'analyze' without submission fields fetches the audit prompt + branch signals; 'analyze' with score + markdown submits the completed report; 'list' browses past reports; 'get' retrieves one report by reportId.",
      },
      orgId: {
        type: "string",
        description:
          "Organization ID (Required for submissions). Resolve via health() if you don't have it.",
      },
      branch: { type: "string", description: "Git branch." },
      scope: {
        type: "string",
        enum: ["testcase", "feature", "spec_file", "suite"],
        description: "Audit scope for submissions. Defaults to 'suite'.",
      },
      target: {
        type: "object",
        description: "Structured audit target for scoped submissions.",
        additionalProperties: true,
      },
      reportName: {
        type: "string",
        description: "Human-readable title for a submitted report.",
      },
      score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Audit score (0-100). Required when submitting.",
      },
      findings: {
        type: "array",
        description: `Findings array. category must be one of: ${AUDIT_CATEGORY_LIST}.`,
        items: { type: "object", additionalProperties: true },
      },
      recommendations: {
        type: "array",
        description: "Recommendation strings.",
        items: { type: "string" },
      },
      markdownReport: {
        type: "string",
        description:
          "Completed markdown report content. Prefer markdownReportPath.",
      },
      markdownReportPath: {
        type: "string",
        description:
          "Path to a local markdown file to submit. Relative from TESTDINO_MCP_WORKSPACE, or absolute.",
      },
      reportId: {
        type: "string",
        description: "Report ID for action='get'.",
      },
      limit: {
        type: "number",
        description: "Page size for action='list'.",
      },
      page: {
        type: "number",
        description: "Page number for action='list'.",
      },
      writeMarkdown: {
        type: "boolean",
        description:
          "When true, write the markdown report to a local file (submissions + get).",
      },
      outputPath: {
        type: "string",
        description:
          "Relative file path for local save. Resolved from TESTDINO_MCP_WORKSPACE. Defaults to TEST-AUDIT.md.",
      },
    },
    required: ["projectId", "action"],
  },
};

// Re-exported so callers migrating from the omnibus tool know the new surface
// exists without hunting for it.
export { getAuditReportTool, submitAuditReportTool };

async function isSubmission(args: TestAuditArgs): Promise<boolean> {
  if (args.score == null) {
    return false;
  }
  if (args.markdownReport && normalizeMarkdownReport(args.markdownReport)) {
    return true;
  }
  if (args.markdownReportPath) {
    try {
      const md = await readMarkdownFromPath(args.markdownReportPath);
      return Boolean(normalizeMarkdownReport(md));
    } catch {
      return false;
    }
  }
  return false;
}

export async function handleTestAudit(args?: TestAuditArgs) {
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }
  if (!args.action) {
    throw new Error("action is required");
  }

  const VALID_ACTIONS: TestAuditAction[] = ["analyze", "list", "get"];
  if (!VALID_ACTIONS.includes(args.action)) {
    throw new Error(
      `Invalid action '${args.action}'. Must be one of: ${VALID_ACTIONS.join(", ")}`
    );
  }

  if (args.action === "list") {
    return handleGetAuditReport({
      token: args.token,
      projectId: args.projectId,
      action: "list",
      branch: args.branch,
      limit: args.limit,
      page: args.page,
    });
  }

  if (args.action === "get") {
    if (!args.reportId) {
      throw new Error("reportId is required for get action");
    }
    return handleGetAuditReport({
      token: args.token,
      projectId: args.projectId,
      action: "get",
      reportId: args.reportId,
      writeMarkdown: args.writeMarkdown,
      outputPath: args.outputPath,
    });
  }

  // action === 'analyze'
  if (await isSubmission(args)) {
    return handleSubmitAuditReport({
      token: args.token,
      projectId: args.projectId,
      orgId: args.orgId as string,
      branch: args.branch,
      scope: args.scope,
      target: args.target,
      reportName: args.reportName,
      score: args.score as number,
      findings: args.findings,
      recommendations: args.recommendations,
      markdownReport: args.markdownReport,
      markdownReportPath: args.markdownReportPath,
      writeMarkdown: args.writeMarkdown,
      outputPath: args.outputPath,
    });
  }

  // Context fetch (analyze without submission fields)
  return handleGetAuditReport({
    token: args.token,
    projectId: args.projectId,
    action: "context",
    branch: args.branch,
  });
}
