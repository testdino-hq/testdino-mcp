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
    "Run a single-pass test quality audit. Use action='analyze' to fetch the analysis prompt and branch signals from TestDino. Analyze local test code, write the markdown report to a local file, then call this tool again with markdownReportPath (the tool reads it) plus score/findings/recommendations to submit. Use feature/spec scopes when the user names a slice like auth/login. If analyze fails with project/auth access errors, resolve projectId with health() instead of writing a fallback pseudo-audit. Use action='list' to browse past reports, optionally filtered by an explicit branch, and action='get' to retrieve one.",
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
          "Git branch to scope the audit to. Required for 'analyze' unless the tool can detect it from git. Optional for 'list' as a filter.",
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
        if (!inferredBranch) {
          throw new Error("branch is required when submitting an audit report");
        }
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
            branch: inferredBranch,
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
        // Fetch audit context
        if (!inferredBranch) {
          throw new Error("branch is required for analyze action");
        }

        const contextUrl = endpoints.getAuditContext({
          projectId: String(args.projectId),
          branch: inferredBranch,
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
