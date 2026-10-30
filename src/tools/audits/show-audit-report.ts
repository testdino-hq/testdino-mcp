/**
 * show_audit_report — a saved audit as a scorecard (MCP Apps).
 *
 * The hosted route answers with the hosted tool result itself, so this tool
 * returns it unchanged, errors included: a host that renders MCP Apps shows
 * the same card as the hosted connector, every other host the same text.
 */

import { endpoints } from "../../lib/endpoints.js";
import { ApiError, apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import type { ToolResult } from "../../lib/tool-result.js";

export const AUDIT_REPORT_URI = "ui://testdino/audit-report/v1";

interface ShowAuditReportArgs {
  token?: string;
  projectId: string;
  reportId?: string;
  branch?: string;
}

// Copied from the hosted tools/list, card metadata included.
export const showAuditReportTool = {
  name: "show_audit_report",
  title: "Show TestDino Audit Scorecard",
  description:
    "Read-only. Shows a saved TestDino Playwright audit as a scorecard: the score and its band (Strong, Fair, Needs work, At risk), where the points were lost, the top issues, and a link to the full report. Use when the user asks to see, show or summarize an audit report. Pass reportId for a specific report; omit it for the latest one, optionally on a branch.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (required)",
      },
      reportId: {
        type: "string",
        description: "Audit report ID. Omit for the latest report.",
      },
      branch: {
        type: "string",
        description:
          "Branch to take the latest report from when reportId is omitted.",
      },
    },
    required: ["projectId"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
  },
  execution: {
    taskSupport: "forbidden",
  },
  _meta: {
    ui: {
      resourceUri: "ui://testdino/audit-report/v1",
    },
    "ui/resourceUri": "ui://testdino/audit-report/v1",
  },
};

function isToolResult(body: unknown): body is ToolResult {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { content?: unknown }).content)
  );
}

export async function handleShowAuditReport(
  args?: ShowAuditReportArgs
): Promise<ToolResult> {
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

  const url = endpoints.showAuditReport({
    projectId: String(args.projectId),
    ...(args.reportId ? { reportId: String(args.reportId) } : {}),
    ...(args.branch ? { branch: String(args.branch) } : {}),
  });

  try {
    return await apiRequestJson<ToolResult>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    // "Not found" and "couldn't load" come back as the hosted tool result with a 4xx/5xx status.
    if (error instanceof ApiError && isToolResult(error.body)) {
      return error.body;
    }
    throw error;
  }
}
