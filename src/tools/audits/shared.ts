/**
 * Shared helpers for the audit tools.
 *
 * `test_audit` (deprecated alias), `get_audit_report`, and `submit_audit_report`
 * all reuse this module — filesystem plumbing, git branch detection, markdown
 * cleanup, findings sanitization, and error-message normalization.
 */

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { execSync } from "child_process";
import { dirname, isAbsolute, relative, resolve, sep } from "path";
import {
  AUDIT_CATEGORY_CODES,
  isRecognizedAuditCategory,
  normalizeAuditCategory,
  normalizeAuditSubCategory,
} from "./audit-categories.js";

export const AUDIT_CATEGORY_LIST = AUDIT_CATEGORY_CODES.join(", ");

const LEADING_PROGRESS_LINE_PATTERN =
  /^\*\*(?:reading|scanning|building|analy(?:s|z)ing|reviewing|inspecting|writing|generating)\b[^*]*\*\*$/i;

/** Base directory for resolving relative paths when the MCP starts outside the repo. */
export function getWorkspaceBase(): string {
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

export function resolveWorkspacePath(
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

export async function resolveMarkdownReportPath(
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

export async function readMarkdownFromPath(
  requestedPath: string
): Promise<string> {
  const filePath = await resolveMarkdownReportPath(requestedPath);
  return await readFile(filePath, "utf-8");
}

export async function writeLocalReport(
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

export function normalizeMarkdownReport(markdownReport: string): string {
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

export function detectBranch(): string | undefined {
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

export function sanitizeAuditFindings(
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

export function normalizeAuditErrorMessage(errorMessage: string): string {
  if (/PROJECT_NOT_FOUND/i.test(errorMessage)) {
    return "Project not found or inaccessible for this PAT. Call health() to pick a valid projectId, then retry. Do not continue with a fallback local-only audit report.";
  }

  if (/401|403|unauthorized|forbidden/i.test(errorMessage)) {
    return "TestDino rejected this audit request due to missing or invalid access. Verify TESTDINO_PAT and project access with health(), then retry. Do not continue with a fallback local-only audit report.";
  }

  return errorMessage;
}
