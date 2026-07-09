/**
 * test_audit — DEPRECATED alias tool.
 *
 * Kept for backward compatibility with AI-agent configs that were told to call
 * `test_audit` before the read/write split. Delegates to `get_audit_report`
 * and `submit_audit_report` by action:
 *
 *   action='analyze' (no score+markdown)        → get_audit_report(action='context')
 *   action='analyze' (with score+markdown)      → submit_audit_report(...)
 *   action='list'                               → get_audit_report(action='list')
 *   action='get'                                → get_audit_report(action='get')
 *
 * Removed in v2.0.0. Prefer calling the two new tools directly.
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

let deprecationNoticeFired = false;

function fireDeprecationNoticeOnce(): void {
  if (deprecationNoticeFired) {
    return;
  }
  deprecationNoticeFired = true;
  // stderr, not the tool response — MCP clients pipe stderr for humans.
  // Do NOT use console.log: it corrupts the stdio protocol on stdout.
  console.error(
    "[testdino-mcp] DEPRECATION: `test_audit` will be removed in v2.0.0. " +
      "Migrate to `get_audit_report` (read) and `submit_audit_report` (write). " +
      "See docs/TOOLS.md."
  );
}

export const testAuditTool = {
  name: "test_audit",
  description:
    "DEPRECATED — use `get_audit_report` (read) and `submit_audit_report` (write) instead. " +
    "Legacy TestDino Playwright audit alias, retained for backward compatibility. " +
    "Delegates internally: action='analyze' without a submission → get_audit_report(action='context'); " +
    "action='analyze' with score + markdown → submit_audit_report(...); " +
    "action='list' → get_audit_report(action='list'); action='get' → get_audit_report(action='get'). " +
    "This alias will be removed in v2.0.0.",
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
          "DEPRECATED alias for the read + write split. 'analyze' without submission fields → get_audit_report(context). 'analyze' with score + markdown → submit_audit_report. 'list' / 'get' → get_audit_report.",
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
  fireDeprecationNoticeOnce();

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
