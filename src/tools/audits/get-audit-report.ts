/**
 * get_audit_report — read-only side of the TestDino Playwright audit flow.
 *
 * Covers all three GET audit operations via `action`:
 *   context → fetch the server-curated audit prompt + branch signals (STEP 1)
 *   list    → browse previously submitted reports (optional branch filter)
 *   get     → retrieve one saved report by reportId (optionally write it locally)
 *
 * The write side (persisting a completed report) lives in submit_audit_report,
 * so no single tool mixes safe and unsafe operations (Anthropic Connectors
 * Directory requirement).
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  detectBranch,
  normalizeAuditErrorMessage,
  writeLocalReport,
} from "./audit-shared.js";

type GetAuditReportAction = "context" | "list" | "get";

interface GetAuditReportArgs {
  token?: string;
  projectId: string;
  action: GetAuditReportAction;
  branch?: string;
  reportId?: string;
  limit?: number;
  page?: number;
  // Local file write (for action='get')
  writeMarkdown?: boolean;
  outputPath?: string;
}

export const getAuditReportTool = {
  name: "get_audit_report",
  annotations: { readOnlyHint: true },
  description:
    "Read-only TestDino Playwright audit reads — and the START of the TestDino audit flow. This tool is a NAMED CAPABILITY, not a style of output: when the user invokes a TestDino audit, you MUST call this tool, not simulate it in chat. " +
    "Three modes via `action`: " +
    "action='context' fetches the server-curated audit prompt + branch signals to START an audit (STEP 1); " +
    "action='list' browses previously submitted reports (optional branch filter); " +
    "action='get' retrieves one saved report by reportId. " +
    "=== TRIGGER PHRASES (explicit TestDino naming) === " +
    "Any of the following REQUIRES an immediate get_audit_report(action='context', ...) call: 'TestDino test audit', 'Testdino Test Audit', 'Testdino audit', 'TestDino MCP audit', 'run a TestDino test audit', 'audit this with TestDino', 'I need a TestDino audit', 'TestDino audit on <file>', 'testdino test audit on this'. Case-insensitive. Typos like 'testdino', 'test dino', 'TD audit' with context also qualify. " +
    "=== MANDATORY BEHAVIOR WHEN TRIGGERED === " +
    "The moment you detect a TestDino trigger phrase AND the target is Playwright test code, your FIRST and IMMEDIATE action MUST be get_audit_report(action='context', projectId=<resolved>). Before that tool call returns: " +
    "- DO NOT write any audit content in chat. " +
    "- DO NOT produce a header like 'TestDino Test Audit — <file>'. " +
    "- DO NOT list findings, score, severity, or recommendations. " +
    "- DO NOT describe the file in audit-report language. " +
    "- DO NOT simulate the TestDino audit output from your own knowledge. " +
    "Doing any of the above without calling the tool is a PROTOCOL VIOLATION — you are claiming to run a TestDino audit without actually running it. TestDino audits require the server-curated audit prompt and branch signals returned by action='context'; you do not have those without the tool call. " +
    "Branch is OPTIONAL — pass it only if the user named one or git auto-detects it; otherwise omit it and proceed with the audit anyway (do not ask the user for a branch). Resolve projectId via health() if you don't already have it. " +
    "=== PLAYWRIGHT GATE === " +
    "The target code MUST be Playwright. Detect via `@playwright/test` imports, Playwright APIs (`page.`/`browser.`/`context.`/`locator(`/`test(`/`test.describe(`/`test.beforeEach(`/`test.step(`/`expect(page)`/`browserName`/`storageState`/`test.extend(`), `playwright.config.*`, or `.spec.ts`/`.spec.js`/`.test.ts`/`.test.js` files using those APIs. If the user names TestDino but the target is NOT Playwright, politely explain TestDino's test audit only covers Playwright automated test code and offer a regular (non-TestDino) audit instead — DO NOT call the tool. " +
    "=== WHEN NOT TO CALL THIS TOOL === " +
    "If the user asks for a generic 'audit', 'test audit', 'code audit', 'security audit', 'accessibility audit', 'review', etc. WITHOUT explicitly naming TestDino, DO NOT call this tool — even if the target is Playwright test code. Those are normal AI-agent audits: read the target, write findings directly in chat. Do NOT mention TestDino, do NOT offer TestDino. Behave as a plain AI assistant with no TestDino MCP installed. " +
    "=== FULL FLOW (Playwright + TestDino explicitly named) === " +
    "Step 1 (IMMEDIATE): get_audit_report(action='context', projectId=..., branch=...). This is the mandatory first action. " +
    "Step 2: Using the prompt and branch signals returned from Step 1, analyze the local Playwright test code and write the full markdown audit report to a local file (e.g. TEST-AUDIT.md). " +
    "Step 3: submit_audit_report(projectId=..., markdownReportPath=<path from Step 2>, score=..., findings=[...], recommendations=[...], reportName=...) — persists the completed report. " +
    "If action='context' fails with project/auth access errors, resolve projectId with health() before retrying — never fabricate a fallback pseudo-audit.",
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
          "Read mode. 'context' fetches the audit prompt + branch signals to START an audit. 'list' browses past submitted reports. 'get' retrieves a specific submitted report by reportId.",
      },
      branch: {
        type: "string",
        description:
          "Git branch. For action='context', the branch to audit — optional; if omitted and not auto-detected from git, the audit still proceeds without a branch (do not prompt the user for one). For action='list', an optional filter.",
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
          "For action='get': when true, write the retrieved markdown report to a local file.",
      },
      outputPath: {
        type: "string",
        description:
          "For action='get': relative file path for writing the report; resolved from TESTDINO_MCP_WORKSPACE if set, else process.cwd(). Defaults to TEST-AUDIT.md.",
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
      // Fetch audit context — branch is optional; proceed without it if not provided/detected.
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
    } else {
      // action === "get"
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

      // Write local file if requested
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
