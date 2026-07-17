/**
 * submit_audit_report — write. FINAL STEP of the TestDino Playwright audit flow.
 *
 * Persists a completed audit report to the MCP-owned Mongo store. Call this
 * only AFTER `get_audit_report(action='context')` and after you have analyzed
 * the local Playwright code and produced findings.
 *
 * orgId is required — resolve via health() if the caller does not have it.
 * Matches the streaming `submit_audit_report` contract.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  AUDIT_CATEGORY_LIST,
  detectBranch,
  normalizeAuditErrorMessage,
  normalizeMarkdownReport,
  readMarkdownFromPath,
  sanitizeAuditFindings,
  writeLocalReport,
} from "./shared.js";

interface SubmitAuditReportArgs {
  token?: string;
  projectId: string;
  orgId: string;
  branch?: string;
  scope?: "testcase" | "feature" | "spec_file" | "suite";
  target?: Record<string, unknown>;
  reportName?: string;
  score: number;
  findings?: Array<Record<string, unknown>>;
  recommendations?: string[];
  markdownReport?: string;
  markdownReportPath?: string;
  writeMarkdown?: boolean;
  outputPath?: string;
}

export const submitAuditReportTool = {
  name: "submit_audit_report",
  description:
    "FINAL STEP of the TestDino Playwright audit flow — submits a completed audit report. Requires write permission. " +
    "Call this only AFTER get_audit_report(action='context') and after you have analyzed the local Playwright code and produced findings. " +
    "score (0-100) and either markdownReport or markdownReportPath are required. Include findings, recommendations, reportName, branch, scope, and target as available. " +
    "Every finding MUST include title, summary, and severity (low|medium|high|critical) — incomplete findings are rejected, not stored. target, if sent, accepts only { value, path }. " +
    "orgId is required — resolve it via health() if you do not already have it. " +
    "Use the same branch/scope/target you passed to get_audit_report(action='context') so the report attaches to the right audit context.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      orgId: {
        type: "string",
        description:
          "Organization ID (Required to submit). Resolve via health() if you don't have it.",
      },
      branch: {
        type: "string",
        description:
          "Git branch that was audited. Optional — auto-detected via git if omitted.",
      },
      scope: {
        type: "string",
        enum: ["testcase", "feature", "spec_file", "suite"],
        description:
          "Audit scope. Defaults to 'suite'. Use 'feature' or 'spec_file' when the user names a slice such as auth/login, dashboards, or a specific spec.",
      },
      target: {
        type: "object",
        description:
          "Optional scoped-audit target. Only { value, path } (non-empty strings) are stored — the dashboard reads these; any other key is rejected.",
        properties: {
          value: {
            type: "string",
            description: "Human-readable target, e.g. a feature area.",
          },
          path: {
            type: "string",
            description: "File or spec path the audit was scoped to.",
          },
        },
        additionalProperties: false,
      },
      reportName: {
        type: "string",
        description:
          "Short human-readable title for the saved report (e.g. 'Login Flow Tests', 'API Integration Suite').",
      },
      score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Final audit score (0-100). Required.",
      },
      findings: {
        type: "array",
        description: `Array of findings. Each finding REQUIRES title, summary, and severity (critical/high/medium/low) — a finding missing any of these is rejected, not stored. category must be one of: ${AUDIT_CATEGORY_LIST}. Optional: subCategory, recommendation, and evidence (file, lineStart, lineEnd, observation).`,
        items: { type: "object", additionalProperties: true },
      },
      recommendations: {
        type: "array",
        description: "Array of recommendation strings.",
        items: { type: "string" },
      },
      markdownReport: {
        type: "string",
        description:
          "The complete markdown report content. Prefer markdownReportPath to avoid large tool calls.",
      },
      markdownReportPath: {
        type: "string",
        description:
          "Path to a local markdown file to read for submission. Relative from TESTDINO_MCP_WORKSPACE (or an absolute path). Preferred over markdownReport.",
      },
      writeMarkdown: {
        type: "boolean",
        description:
          "When true, also write the submitted markdown to a local file. Ignored when markdownReportPath was supplied (the file already exists on disk).",
      },
      outputPath: {
        type: "string",
        description:
          "Relative file path for the local save (see writeMarkdown). Resolved from TESTDINO_MCP_WORKSPACE. Defaults to TEST-AUDIT.md.",
      },
    },
    required: ["projectId", "orgId", "score"],
  },
};

export async function handleSubmitAuditReport(args?: SubmitAuditReportArgs) {
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  if (!args?.orgId) {
    throw new Error(
      "orgId is required to submit an audit report. Resolve it via health() and retry."
    );
  }

  if (typeof args.score !== "number") {
    throw new Error("score is required (0-100)");
  }

  const explicitBranch =
    typeof args.branch === "string" && args.branch.trim()
      ? args.branch.trim()
      : undefined;
  const inferredBranch = explicitBranch || detectBranch();

  try {
    // Resolve markdown: prefer file path, fall back to inline.
    let markdownReport = args.markdownReport;
    if (!markdownReport && args.markdownReportPath) {
      markdownReport = await readMarkdownFromPath(args.markdownReportPath);
    }
    const normalizedMarkdownReport =
      typeof markdownReport === "string"
        ? normalizeMarkdownReport(markdownReport)
        : "";

    if (!normalizedMarkdownReport) {
      throw new Error(
        "markdownReport (or a valid markdownReportPath) is required to submit an audit report"
      );
    }

    const submitUrl = endpoints.submitAuditReport({
      projectId: String(args.projectId),
    });

    const scope = args.scope || "suite";
    const hasExplicitTarget =
      args.target &&
      Object.values(args.target).some((v) => typeof v === "string" && v.trim());
    const target = hasExplicitTarget ? args.target! : {};
    const sanitizedFindings = sanitizeAuditFindings(args.findings || []);

    let response = await apiRequestJson(submitUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        orgId: String(args.orgId),
        ...(inferredBranch ? { branch: inferredBranch } : {}),
        scope,
        target,
        reportName: args.reportName || undefined,
        score: args.score,
        findings: sanitizedFindings,
        recommendations: args.recommendations || [],
        markdownReport: normalizedMarkdownReport,
      },
    });

    // Local file save only when the markdown was NOT read from a path
    // (path implies the file already exists on disk).
    if (args.writeMarkdown && !args.markdownReportPath) {
      try {
        const writeResult = await writeLocalReport(
          normalizedMarkdownReport,
          args.outputPath
        );
        response = {
          ...(response as Record<string, unknown>),
          localReportWrite: writeResult,
        };
      } catch (writeError) {
        response = {
          ...(response as Record<string, unknown>),
          localReportWrite: {
            saved: false,
            reason:
              writeError instanceof Error
                ? writeError.message
                : String(writeError),
          },
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to submit audit report: ${normalizeAuditErrorMessage(errorMessage)}`
    );
  }
}
