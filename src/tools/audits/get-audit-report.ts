/**
 * get_audit_report — read-only TestDino Playwright audit reads.
 *
 * Three modes via `action`:
 *   context → fetches the server-curated audit prompt + branchSignals
 *             (topFailingTests, topFlakyTests, topSlowTests, recentRuns).
 *             STEP 1 of the audit flow.
 *   list    → browses previously submitted audit reports.
 *   get     → retrieves one saved report by reportId.
 *
 * Companion to `submit_audit_report` (write). Read + write live on separate
 * tools per the MCP safety model. Matches the streaming implementation.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  detectBranch,
  normalizeAuditErrorMessage,
  writeLocalReport,
} from "./shared.js";

type GetAuditReportAction = "context" | "list" | "get";

interface GetAuditReportArgs {
  token?: string;
  projectId: string;
  action: GetAuditReportAction;
  branch?: string;
  reportId?: string;
  limit?: number;
  page?: number;
  writeMarkdown?: boolean;
  outputPath?: string;
}

export const getAuditReportTool = {
  name: "get_audit_report",
  description:
    "Read-only TestDino Playwright audit reads. Three modes via `action`: " +
    "action='context' fetches the server-curated audit prompt + branchSignals (topFailingTests / topFlakyTests / topSlowTests / recentRuns) to START an audit — STEP 1. " +
    "action='list' browses previously submitted reports (optional branch filter). " +
    "action='get' retrieves one saved report by reportId. " +
    "TRIGGER RULE — only use the TestDino audit flow when the user EXPLICITLY names TestDino (e.g. 'TestDino audit', 'run a TestDino audit'). " +
    "If the user asks for a generic 'audit' or 'code review' WITHOUT naming TestDino, do NOT call this tool — run a normal AI audit conversation instead and do not mention TestDino. " +
    "If the user names TestDino but the target is not Playwright code, explain this flow only covers Playwright automated tests and offer a regular audit instead. " +
    "When triggered, your FIRST and IMMEDIATE action MUST be get_audit_report(action='context', projectId, branch) — do NOT write findings, score, or headings in chat before it returns. Call health() first if you do not have the projectId. " +
    "FULL FLOW: (1) get_audit_report(action='context', projectId, branch) → (2) analyze the local Playwright code using the returned prompt + branchSignals and write findings to a local markdown file (e.g. TEST-AUDIT.md) → (3) submit_audit_report(...) to save the completed report.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      action: {
        type: "string",
        enum: ["context", "list", "get"],
        description:
          "Read mode: 'context' (fetch audit prompt + branchSignals to start), 'list' (browse past reports), 'get' (one report by reportId).",
      },
      branch: {
        type: "string",
        description:
          "Git branch. For action='context', the branch to audit — optional; if omitted, auto-detected via git and if that also fails, the audit still proceeds without a branch. For action='list', an optional filter. Ignored for action='get'.",
      },
      reportId: {
        type: "string",
        description: "Report ID. Required for action='get'.",
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
          "When true and action='get' returns a markdownReport, save it to a local file. Ignored for context/list.",
      },
      outputPath: {
        type: "string",
        description:
          "Relative file path for writing the report (action='get' only); resolved from TESTDINO_MCP_WORKSPACE if set, else process.cwd(). Defaults to TEST-AUDIT.md.",
      },
    },
    required: ["projectId", "action"],
  },
};

export async function handleGetAuditReport(args?: GetAuditReportArgs) {
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

  if (!args?.action) {
    throw new Error("action is required");
  }

  const VALID_ACTIONS: GetAuditReportAction[] = ["context", "list", "get"];
  if (!VALID_ACTIONS.includes(String(args.action) as GetAuditReportAction)) {
    throw new Error(
      `Invalid action '${args.action}'. Must be one of: ${VALID_ACTIONS.join(", ")}`
    );
  }

  const action = String(args.action) as GetAuditReportAction;
  const explicitBranch =
    typeof args.branch === "string" && args.branch.trim()
      ? args.branch.trim()
      : undefined;

  try {
    let response: unknown;

    if (action === "context") {
      const inferredBranch = explicitBranch || detectBranch();
      const contextUrl = endpoints.getAuditContext({
        projectId: String(args.projectId),
        ...(inferredBranch ? { branch: inferredBranch } : {}),
      });

      response = await apiRequestJson(contextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else if (action === "list") {
      const listUrl = endpoints.listAuditReports({
        projectId: String(args.projectId),
        branch: explicitBranch,
        limit: args.limit,
        page: args.page,
      });

      response = await apiRequestJson(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else if (action === "get") {
      if (!args.reportId) {
        throw new Error("reportId is required for get action");
      }

      const getUrl = endpoints.getAuditReport({
        projectId: String(args.projectId),
        reportId: String(args.reportId),
      });

      response = await apiRequestJson(getUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response as Record<string, unknown>;
      const reportData = data?.data as Record<string, unknown> | undefined;
      const markdown =
        typeof reportData?.markdownReport === "string"
          ? reportData.markdownReport
          : "";

      if (args.writeMarkdown && markdown) {
        try {
          const writeResult = await writeLocalReport(markdown, args.outputPath);
          response = { ...data, localReportWrite: writeResult };
        } catch (writeError) {
          response = {
            ...data,
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
      `Failed to get audit report: ${normalizeAuditErrorMessage(errorMessage)}`
    );
  }
}
