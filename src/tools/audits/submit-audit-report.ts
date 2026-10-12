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
  detectBranch,
  normalizeAuditErrorMessage,
  normalizeMarkdownReport,
  readMarkdownFromPath,
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
  title: "Submit TestDino Audit Report",
  description:
    "FINAL STEP of the TestDino Playwright audit flow — submits a completed audit report. Requires write permission. Call this only AFTER get_audit_report(action='context') and after you have analyzed the local Playwright code and produced findings. markdownReport is required; include findings, recommendations, reportName, branch, scope, and target as available. Do NOT compute a score — TestDino derives it from the findings you submit and returns it with a per-category breakdown. orgId is required — resolve it via health() if you do not have it. Every finding MUST include title, summary, and severity (low|medium|high|critical) — incomplete findings are rejected, not stored. category is normalized to a known bucket. target, if sent, accepts only { value, path } as non-empty strings. Use the same branch/scope/target you passed to get_audit_report(action='context') so the report attaches to the right context.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (required)",
      },
      orgId: {
        type: "string",
        description:
          "Organization ID (required to submit). Resolve via health() if you don't have it.",
      },
      branch: {
        type: "string",
        description: "Git branch that was audited.",
      },
      scope: {
        type: "string",
        enum: ["testcase", "feature", "spec_file", "suite"],
        description: "Audit scope. Defaults to 'suite'.",
      },
      target: {
        type: "object",
        properties: {
          value: {
            type: "string",
            minLength: 1,
          },
          path: {
            type: "string",
            minLength: 1,
          },
        },
        additionalProperties: false,
        description:
          "Optional scoped-audit target. Only { value, path } (non-empty strings) are stored — the dashboard reads these; any other key is rejected.",
      },
      reportName: {
        type: "string",
        description: "Short human-readable title for the saved report",
      },
      score: {
        type: "number",
        description:
          "Ignored. TestDino computes the score from findings; kept so older clients still submit.",
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                'Audit category. Prefer one of: surface_level_tests, missing_validation, stability_issues, hard_to_maintain, coverage_gaps, organization_ownership, setup_configuration, duplication_overlap, other. Unknown or missing values normalize to "other".',
            },
            subCategory: {
              type: "string",
            },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description:
                "Required. Impact level: low, medium, high, or critical.",
            },
            title: {
              type: "string",
              minLength: 1,
              description: "Required. Short issue label.",
            },
            summary: {
              type: "string",
              minLength: 1,
              description:
                "Required. Why confidence is lost — rendered as the finding summary.",
            },
            recommendation: {
              type: "string",
              description:
                "What to change, where, and the stronger pattern to use.",
            },
            prevalence: {
              type: "string",
              description:
                'Counts, ratios, or scope, e.g. "7 call sites across 2 files".',
            },
            evidence: {
              type: "array",
              items: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "object",
                    properties: {
                      file: {
                        type: "string",
                      },
                      lineStart: {
                        type: "number",
                      },
                      lineEnd: {
                        type: "number",
                      },
                      label: {
                        type: "string",
                      },
                      observation: {
                        type: "string",
                      },
                    },
                    additionalProperties: true,
                  },
                ],
              },
              description:
                "Concrete file:line examples, as strings or {file, lineStart, lineEnd, observation} objects.",
            },
          },
          required: ["severity", "title", "summary"],
          additionalProperties: true,
        },
        description: "Structured findings for the completed report",
      },
      recommendations: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Recommendation strings for the completed report",
      },
      markdownReport: {
        type: "string",
        description: "Completed markdown report (required).",
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
    required: ["projectId"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  execution: {
    taskSupport: "forbidden",
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

    let response = await apiRequestJson(submitUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        orgId: args.orgId,
        ...(inferredBranch ? { branch: inferredBranch } : {}),
        scope: args.scope,
        target: args.target,
        reportName: args.reportName,
        score: args.score,
        findings: args.findings,
        recommendations: args.recommendations,
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
      `Failed to submit audit report: ${normalizeAuditErrorMessage(errorMessage)}`,
      { cause: error }
    );
  }
}
