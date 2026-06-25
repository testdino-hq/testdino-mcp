/**
 * submit_audit_report — write side of the TestDino Playwright audit flow.
 *
 * FINAL STEP: persists a completed audit report (score + markdown + findings)
 * back to TestDino. Requires write permission. The read side (context / list /
 * get) lives in get_audit_report, so no single tool mixes safe and unsafe
 * operations (Anthropic Connectors Directory requirement).
 */

import { readFile } from "fs/promises";
import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  AUDIT_CATEGORY_LIST,
  detectBranch,
  normalizeAuditErrorMessage,
  normalizeMarkdownReport,
  resolveMarkdownReportPath,
  sanitizeAuditFindings,
  writeLocalReport,
} from "./audit-shared.js";

interface SubmitAuditReportArgs {
  token?: string;
  projectId: string;
  orgId?: string;
  branch?: string;
  scope?: string;
  target?: Record<string, unknown>;
  reportName?: string;
  score?: number;
  findings?: Array<Record<string, unknown>>;
  recommendations?: string[];
  markdownReport?: string;
  markdownReportPath?: string;
  // Local file write
  writeMarkdown?: boolean;
  outputPath?: string;
}

export const submitAuditReportTool = {
  name: "submit_audit_report",
  annotations: { readOnlyHint: false, destructiveHint: false },
  description:
    "FINAL STEP of the TestDino Playwright audit flow — submits a completed audit report. Requires write permission. " +
    "Call this only AFTER get_audit_report(action='context') and after you have analyzed the local Playwright code and produced findings. " +
    "score (0-100) and the markdown report are required; provide the report via markdownReportPath (preferred — points at a local file) or inline markdownReport. orgId is required — resolve it via health() if you do not have it. Include findings, recommendations, reportName, branch, scope, and target as available. " +
    "Use the same branch/scope/target you passed to get_audit_report(action='context') so the report attaches to the right context. " +
    "Scope: use 'feature' or 'spec_file' when the user named a slice like auth/login; defaults to 'suite'. " +
    "If submission fails with project/auth access errors, resolve projectId with health() before retrying — never fabricate a fallback pseudo-audit.",
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
          "Organization ID (required to submit). Resolve it via health() if you don't already have it.",
      },
      branch: {
        type: "string",
        description:
          "Git branch that was audited. Optional — auto-detected from git when omitted. Use the same branch you passed to get_audit_report(action='context').",
      },
      scope: {
        type: "string",
        enum: ["testcase", "feature", "spec_file", "suite"],
        description:
          "Audit scope. Defaults to 'suite'. Use 'feature' or 'spec_file' when the user named a slice such as auth/login, dashboards, or a specific spec.",
      },
      target: {
        type: "object",
        description:
          "Structured audit target, such as spec path or feature area. Pass this for scoped audits so the report stays centered on that slice.",
        additionalProperties: true,
      },
      reportName: {
        type: "string",
        description:
          "A short, human-readable name for the audit report (e.g. 'Login Flow Tests', 'API Integration Suite'). Displayed as the report title in the dashboard.",
      },
      score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Final audit score (0-100). Required.",
      },
      findings: {
        type: "array",
        description: `Array of findings. Each should have: title, category, severity (critical/high/medium/low), summary, recommendation, and evidence (file, lineStart, lineEnd, observation). category must be one of: ${AUDIT_CATEGORY_LIST}. Optional: subCategory.`,
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
          "The complete markdown report content. Prefer using markdownReportPath instead to avoid large tool calls.",
      },
      markdownReportPath: {
        type: "string",
        description:
          "Path to a local markdown file to read for submission. Use a relative path from the workspace (see TESTDINO_MCP_WORKSPACE), or an absolute path. Preferred over markdownReport.",
      },
      writeMarkdown: {
        type: "boolean",
        description:
          "When true, also write the submitted markdown report to a local file (skipped when the report was read from markdownReportPath).",
      },
      outputPath: {
        type: "string",
        description:
          "Relative file path for writing the report; resolved from TESTDINO_MCP_WORKSPACE if set, else process.cwd(). Defaults to TEST-AUDIT.md.",
      },
    },
    required: ["projectId", "score"],
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

  if (args.score == null) {
    throw new Error("score is required to submit an audit report");
  }

  const orgId =
    typeof args.orgId === "string" && args.orgId.trim()
      ? args.orgId.trim()
      : undefined;
  if (!orgId) {
    throw new Error(
      "orgId is required to submit an audit report. Resolve it via health() if you don't have it."
    );
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
      const filePath = await resolveMarkdownReportPath(args.markdownReportPath);
      markdownReport = await readFile(filePath, "utf-8");
    }
    const normalizedMarkdownReport =
      typeof markdownReport === "string"
        ? normalizeMarkdownReport(markdownReport)
        : "";

    if (!normalizedMarkdownReport) {
      throw new Error(
        "A markdown report is required to submit. Provide markdownReportPath (preferred) or inline markdownReport."
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

    let response: unknown = await apiRequestJson(submitUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        orgId,
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

    // Write local file if requested (skip if already read from file).
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
