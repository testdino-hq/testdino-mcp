/**
 * Test quality audit tool (single-pass)
 *
 * Replaces the multi-round guided audit with a simple 2-step flow:
 * 1. Fetch context (prompt + branch signals + last audit) from server
 * 2. Submit completed report back to server
 */

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { execSync } from "child_process";
import { dirname, isAbsolute, relative, resolve, sep } from "path";
import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  AUDIT_CATEGORY_CODES,
  isRecognizedAuditCategory,
  normalizeAuditCategory,
  normalizeAuditSubCategory,
} from "./audit-categories.js";

type TestAuditAction = "analyze" | "list" | "get";

interface TestAuditArgs {
  token?: string;
  projectId: string;
  action: TestAuditAction;
  branch?: string;
  scope?: string;
  target?: Record<string, unknown>;
  reportName?: string;
  markdownReportPath?: string;
  // For submitting the completed report (called internally after analysis)
  score?: number;
  findings?: Array<Record<string, unknown>>;
  recommendations?: string[];
  markdownReport?: string;
  // For list/get
  reportId?: string;
  limit?: number;
  page?: number;
  // Local file write
  writeMarkdown?: boolean;
  outputPath?: string;
}

const LEADING_PROGRESS_LINE_PATTERN =
  /^\*\*(?:reading|scanning|building|analy(?:s|z)ing|reviewing|inspecting|writing|generating)\b[^*]*\*\*$/i;
const AUDIT_CATEGORY_LIST = AUDIT_CATEGORY_CODES.join(", ");

export const testAuditTool = {
  name: "test_audit",
  description:
    "TestDino-backed Playwright test quality audit. This tool is a NAMED CAPABILITY, not a style of output — when the user invokes it, you MUST call this tool, not simulate it in chat. " +
    "=== TRIGGER PHRASES (explicit TestDino naming) === " +
    "Any of the following REQUIRES an immediate tool call: 'TestDino test audit', 'Testdino Test Audit', 'Testdino audit', 'TestDino MCP audit', 'run a TestDino test audit', 'audit this with TestDino', 'I need a TestDino audit', 'TestDino audit on <file>', 'testdino test audit on this'. Case-insensitive. Typos like 'testdino', 'test dino', 'TD audit' with context also qualify. " +
    "=== MANDATORY BEHAVIOR WHEN TRIGGERED === " +
    "The moment you detect a TestDino trigger phrase AND the target is Playwright test code, your FIRST and IMMEDIATE action MUST be to call this tool with action='analyze'. Before that tool call returns: " +
    "- DO NOT write any audit content in chat. " +
    "- DO NOT produce a header like 'TestDino Test Audit — <file>'. " +
    "- DO NOT list findings, score, severity, or recommendations. " +
    "- DO NOT describe the file in audit-report language. " +
    "- DO NOT simulate the TestDino audit output from your own knowledge. " +
    "- Doing any of the above without calling the tool is a PROTOCOL VIOLATION — you are claiming to run a TestDino audit without actually running it. TestDino audits require the server-curated audit prompt and branch signals returned by action='analyze'; you do not have those without the tool call. " +
    "The only valid first step is: test_audit(action='analyze', projectId=<resolved>). Branch is OPTIONAL — pass it only if the user named one or git auto-detects it; otherwise omit it and proceed with the audit anyway (do not ask the user for a branch). Resolve projectId via health() if you don't already have it. Only AFTER that call returns do you read the local Playwright code (guided by the returned prompt + branch signals), build the audit markdown locally, and submit it via a second tool call. " +
    "=== PLAYWRIGHT GATE === " +
    "The target code MUST be Playwright. Detect via `@playwright/test` imports, Playwright APIs (`page.`/`browser.`/`context.`/`locator(`/`test(`/`test.describe(`/`test.beforeEach(`/`test.step(`/`expect(page)`/`browserName`/`storageState`/`test.extend(`), `playwright.config.*`, or `.spec.ts`/`.spec.js`/`.test.ts`/`.test.js` files using those APIs. If the user names TestDino but the target is NOT Playwright, politely explain TestDino's test audit only covers Playwright automated test code and offer a regular (non-TestDino) audit instead — DO NOT call the tool in that case. " +
    "=== WHEN NOT TO CALL THIS TOOL === " +
    "If the user asks for a generic 'audit', 'test audit', 'code audit', 'security audit', 'accessibility audit', 'review', etc. WITHOUT explicitly naming TestDino, DO NOT call this tool — even if the target is Playwright test code. Those are normal AI-agent audits: read the target, write findings directly in chat. Do NOT mention TestDino, do NOT offer TestDino, do NOT say 'I can run a TestDino audit instead'. Behave as a plain AI assistant with no TestDino MCP installed. " +
    "=== FULL FLOW (Playwright + TestDino explicitly named) === " +
    "Step 1 (IMMEDIATE): test_audit(action='analyze', projectId=..., branch=...) — no score, no findings, no markdownReport on this call. This is the mandatory first action. " +
    "Step 2: Using the prompt and branch signals returned from Step 1, analyze the local Playwright test code and write the full markdown audit report to a local file (e.g. TEST-AUDIT.md). " +
    "Step 3: test_audit(action='analyze', markdownReportPath=<path from Step 2>, score=..., findings=[...], recommendations=[...], reportName=...) — submits to TestDino. " +
    "Scope: use 'feature' or 'spec_file' when the user names a slice like auth/login. If analyze fails with project/auth access errors, resolve projectId with health() before retrying — never fabricate a fallback pseudo-audit. " +
    "Other actions: action='list' browses past submitted reports (optionally filtered by branch); action='get' retrieves a specific submitted report.",
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
          "Action to perform. 'analyze' fetches the audit context (prompt + signals) — after analyzing, call this tool again with the report fields to submit. 'list' shows past reports. 'get' retrieves a specific report.",
      },
      branch: {
        type: "string",
        description:
          "Git branch to scope the audit to. Optional — if omitted and not auto-detected from git, the audit still proceeds without a branch. Do not prompt the user for a branch; just call the tool without it. Also acts as a filter for 'list'.",
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
          "Structured audit target, such as spec path or feature area. Pass this when the user asks for a scoped audit so the report stays centered on that slice.",
        additionalProperties: true,
      },
      reportName: {
        type: "string",
        description:
          "A short, human-readable name for the audit report (e.g. 'Login Flow Tests', 'API Integration Suite'). Displayed as the report title in the dashboard. Include when submitting a completed report.",
      },
      score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description:
          "Audit score (0-100). Include when submitting a completed report.",
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
        description: "When true, write the markdown report to a local file.",
      },
      outputPath: {
        type: "string",
        description:
          "Relative file path for writing the report; resolved from TESTDINO_MCP_WORKSPACE if set, else process.cwd(). Defaults to TEST-AUDIT.md.",
      },
    },
    required: ["projectId", "action"],
  },
};

/** Base directory for resolving relative paths when the MCP starts outside the repo. */
function getWorkspaceBase(): string {
  const workspace = process.env.TESTDINO_MCP_WORKSPACE?.trim();
  return workspace ? resolve(workspace) : process.cwd();
}

function assertWithinWorkspaceBase(
  fieldName: string,
  requestedPath: string,
  resolvedPath: string,
  workspaceBase: string
): void {
  const relativePath = relative(workspaceBase, resolvedPath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(
      `${fieldName} resolves outside workspace base: '${requestedPath}'`
    );
  }
}

function resolveWorkspacePath(
  fieldName: string,
  requestedPath: string
): string {
  const trimmedPath = requestedPath.trim();
  const workspaceBase = getWorkspaceBase();

  if (!trimmedPath) {
    throw new Error(`${fieldName} must be a non-empty relative path`);
  }

  if (isAbsolute(trimmedPath)) {
    throw new Error(
      `${fieldName} must be a relative path, got: '${trimmedPath}'`
    );
  }

  const resolvedPath = resolve(workspaceBase, trimmedPath);
  assertWithinWorkspaceBase(
    fieldName,
    trimmedPath,
    resolvedPath,
    workspaceBase
  );

  return resolvedPath;
}

async function resolveMarkdownReportPath(
  requestedPath: string
): Promise<string> {
  const trimmedPath = requestedPath.trim();
  const workspaceBase = getWorkspaceBase();

  if (!trimmedPath) {
    throw new Error("markdownReportPath must be non-empty");
  }

  const resolvedPath = isAbsolute(trimmedPath)
    ? resolve(trimmedPath)
    : resolve(workspaceBase, trimmedPath);

  if (!isAbsolute(trimmedPath)) {
    assertWithinWorkspaceBase(
      "markdownReportPath",
      trimmedPath,
      resolvedPath,
      workspaceBase
    );
  }

  let fileStats;
  try {
    fileStats = await stat(resolvedPath);
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";

    if (errorCode === "ENOENT") {
      throw new Error(
        `markdownReportPath not found: ${resolvedPath}. Set TESTDINO_MCP_WORKSPACE to your project root for relative paths, or pass an absolute path to the file.`
      );
    }

    throw error;
  }

  if (!fileStats.isFile()) {
    throw new Error(`markdownReportPath must be a file: ${resolvedPath}`);
  }

  return resolvedPath;
}

async function writeLocalReport(
  markdownReport: string,
  outputPath?: string
): Promise<{ saved: boolean; path?: string; reason?: string }> {
  const content = markdownReport.trim();
  if (!content) {
    return { saved: false, reason: "markdown_report_empty" };
  }

  const requestedPath =
    typeof outputPath === "string" && outputPath.trim()
      ? outputPath.trim()
      : "TEST-AUDIT.md";

  const resolvedPath = resolveWorkspacePath("outputPath", requestedPath);

  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${content}\n`, "utf-8");

  return { saved: true, path: resolvedPath };
}

function normalizeMarkdownReport(markdownReport: string): string {
  const trimmedMarkdown = markdownReport.replace(/\r\n/g, "\n").trim();
  if (!trimmedMarkdown) {
    return "";
  }

  const lines = trimmedMarkdown.split("\n");
  let scanIndex = 0;

  while (scanIndex < lines.length && !lines[scanIndex].trim()) {
    scanIndex += 1;
  }

  if (scanIndex < lines.length && /^#{1,6}\s+/.test(lines[scanIndex].trim())) {
    scanIndex += 1;
  }

  while (scanIndex < lines.length && !lines[scanIndex].trim()) {
    scanIndex += 1;
  }

  const cleanedLines = [...lines];
  let removedAnyProgressLines = false;

  while (
    scanIndex < cleanedLines.length &&
    LEADING_PROGRESS_LINE_PATTERN.test(cleanedLines[scanIndex].trim())
  ) {
    cleanedLines.splice(scanIndex, 1);
    removedAnyProgressLines = true;

    while (scanIndex < cleanedLines.length && !cleanedLines[scanIndex].trim()) {
      cleanedLines.splice(scanIndex, 1);
    }
  }

  if (!removedAnyProgressLines) {
    return trimmedMarkdown;
  }

  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectBranch(): string | undefined {
  try {
    return (
      execSync("git branch --show-current", {
        cwd: getWorkspaceBase(),
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim() || undefined
    );
  } catch {
    return undefined;
  }
}

function sanitizeAuditFindings(
  findings: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return findings.map((finding, index) => {
    const rawCategory = finding.category;

    if (
      rawCategory != null &&
      typeof rawCategory === "string" &&
      rawCategory.trim() &&
      !isRecognizedAuditCategory(rawCategory)
    ) {
      throw new Error(
        `findings[${index}].category '${rawCategory}' is invalid. Use one of: ${AUDIT_CATEGORY_LIST}`
      );
    }

    const normalizedCategory = normalizeAuditCategory(rawCategory);
    const normalizedSubCategory = normalizeAuditSubCategory(
      finding.subCategory
    );

    return {
      ...finding,
      category: normalizedCategory,
      ...(normalizedSubCategory
        ? { subCategory: normalizedSubCategory }
        : { subCategory: "" }),
    };
  });
}

function normalizeAuditErrorMessage(errorMessage: string): string {
  if (/PROJECT_NOT_FOUND/i.test(errorMessage)) {
    return "Project not found or inaccessible for this PAT. Call health() to pick a valid projectId, then retry test_audit. Do not continue with a fallback local-only audit report.";
  }

  if (/401|403|unauthorized|forbidden/i.test(errorMessage)) {
    return "TestDino rejected this audit request due to missing or invalid access. Verify TESTDINO_PAT and project access with health(), then retry. Do not continue with a fallback local-only audit report.";
  }

  return errorMessage;
}

export async function handleTestAudit(args?: TestAuditArgs) {
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

  const VALID_ACTIONS: TestAuditAction[] = ["analyze", "list", "get"];
  if (!VALID_ACTIONS.includes(String(args.action) as TestAuditAction)) {
    throw new Error(
      `Invalid action '${args.action}'. Must be one of: ${VALID_ACTIONS.join(", ")}`
    );
  }

  const action = String(args.action) as TestAuditAction;
  const explicitBranch =
    typeof args.branch === "string" && args.branch.trim()
      ? args.branch.trim()
      : undefined;
  const inferredBranch = explicitBranch || detectBranch();

  try {
    let response: unknown;

    if (action === "analyze") {
      // Resolve markdown: prefer file path, fall back to inline
      let markdownReport = args.markdownReport;
      if (!markdownReport && args.markdownReportPath) {
        const filePath = await resolveMarkdownReportPath(
          args.markdownReportPath
        );
        markdownReport = await readFile(filePath, "utf-8");
      }
      const normalizedMarkdownReport =
        typeof markdownReport === "string"
          ? normalizeMarkdownReport(markdownReport)
          : "";

      // Check if this is a submission (has score + markdownReport) or a context fetch
      const isSubmission = args.score != null && normalizedMarkdownReport;

      if (isSubmission) {
        // Submit completed report
        const submitUrl = endpoints.submitAuditReport({
          projectId: String(args.projectId),
        });

        const scope = args.scope || "suite";
        const hasExplicitTarget =
          args.target &&
          Object.values(args.target).some(
            (v) => typeof v === "string" && v.trim()
          );
        const target = hasExplicitTarget ? args.target! : {};
        const sanitizedFindings = sanitizeAuditFindings(args.findings || []);

        response = await apiRequestJson(submitUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: {
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

        // Write local file if requested (skip if already read from file)
        if (
          args.writeMarkdown &&
          normalizedMarkdownReport &&
          !args.markdownReportPath
        ) {
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
      } else {
        // Fetch audit context — branch is optional; proceed without it if not provided/detected
        const contextUrl = endpoints.getAuditContext({
          projectId: String(args.projectId),
          ...(inferredBranch ? { branch: inferredBranch } : {}),
        });

        response = await apiRequestJson(contextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
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
      `Failed to run test audit: ${normalizeAuditErrorMessage(errorMessage)}`
    );
  }
}
