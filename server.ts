#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { z } from "zod";

// Import existing tool handlers
import { getApiUrl, getApiKey, setRequestToken } from "./frontend/lib/env.js";
import {
  handleHealth,
  handleListTestRuns,
  handleGetRunDetails,
  handleListTestCases,
  handleGetTestCaseDetails,
  handleDebugTestCase,
  handleListManualTestCases,
  handleGetManualTestCase,
  handleCreateManualTestCase,
  handleUpdateManualTestCase,
  handleListManualTestSuites,
  handleCreateManualTestSuite,
} from "./frontend/tools/index.js";

// The existing handlers return { content: [{ type: string, text: string }] }
// but McpServer expects { type: "text" } literal. This helper casts the result.
function asToolResult(result: { content: { type: string; text: string }[] }): CallToolResult {
  return result as unknown as CallToolResult;
}

// Parse handler result text and extract array data.
// The API may return a raw array, or an object like { testRuns: [...], pagination: {...} }.
// This helper finds the first array value in the response.
async function fetchOrgsAndProjects(): Promise<unknown[]> {
  const token = getApiKey();
  if (!token) throw new Error("Missing TESTDINO_PAT");
  const res = await fetch(`${getApiUrl()}/api/mcp/hello`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json() as any;
  const data = json.data || json;
  return (data.access as unknown[]) || [];
}

function flattenRun(run: any): any {
  return {
    ...run,
    passed: run?.testStats?.passed,
    failed: run?.testStats?.failed,
    skipped: run?.testStats?.skipped,
    flaky: run?.testStats?.flaky,
    total: run?.testStats?.total,
  };
}

function extractArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value)) return value;
      // one level deeper (e.g. { success, data: { testRuns: [...] } })
      if (value && typeof value === "object") {
        for (const inner of Object.values(value as Record<string, unknown>)) {
          if (Array.isArray(inner)) return inner;
        }
      }
    }
  }
  return [];
}

function parseHandlerResult(result: { content: { type: string; text: string }[] }): unknown {
  const text = result.content[0].text as string;
  try {
    return JSON.parse(text);
  } catch {
    // Handler returned a non-JSON error message — throw so callers can catch
    throw new Error(text);
  }
}

// Works both from source (server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const resourceUri = "ui://testdino/app.html";

export function createServer(requestToken?: string): McpServer {
setRequestToken(requestToken);

const server = new McpServer({
  name: "@testdino/mcp",
  version: "2.0.0",
});

// ════════════════════════════════════════════════════════════
// Existing tools — unchanged behaviour, structuredContent added
// so show_testdino panel (if already open) reflects results
// ════════════════════════════════════════════════════════════

server.tool(
  "health",
  "Validates PAT and returns account information with organizations and projects",
  {},
  async () => asToolResult(await handleHealth()),
);

server.tool(
  "list_testruns",
  "Lists and filters test runs for a project",
  {
    projectId: z.string().describe("Project ID"),
    by_branch: z.string().optional().describe("Filter by branch name"),
    by_time_interval: z.string().optional().describe("Time filter: 1d, 3d, weekly, monthly"),
    by_author: z.string().optional().describe("Filter by author"),
    by_commit: z.string().optional().describe("Filter by commit hash"),
    by_environment: z.string().optional().describe("Filter by environment"),
    limit: z.number().optional().describe("Results per page (default: 20)"),
    page: z.number().optional().describe("Page number"),
    get_all: z.boolean().optional().describe("Get all results"),
  },
  async (args) => asToolResult(await handleListTestRuns(args)),
);

server.tool(
  "get_run_details",
  "Gets detailed test run information including statistics, suites, and test cases",
  {
    projectId: z.string().describe("Project ID"),
    testrun_id: z.string().optional().describe("Test run ID (single or comma-separated, max 20)"),
    counter: z.number().optional().describe("Test run counter number"),
  },
  async (args) => asToolResult(await handleGetRunDetails(args)),
);

server.tool(
  "list_testcase",
  "Lists test cases with comprehensive filtering",
  {
    projectId: z.string().describe("Project ID"),
    by_testrun_id: z.string().optional().describe("Test run ID"),
    counter: z.number().optional().describe("Test run counter"),
    by_status: z.string().optional().describe("Filter: passed, failed, skipped, flaky"),
    by_spec_file_name: z.string().optional().describe("Filter by spec file"),
    by_error_category: z.string().optional().describe("Filter by error category"),
    by_browser_name: z.string().optional().describe("Filter by browser"),
    by_tag: z.string().optional().describe("Filter by tag"),
    by_total_runtime: z.string().optional().describe("Filter by runtime"),
    by_artifacts: z.boolean().optional().describe("Filter by artifacts"),
    by_error_message: z.string().optional().describe("Filter by error message"),
    by_attempt_number: z.number().optional().describe("Filter by attempt"),
    by_pages: z.number().optional().describe("Page number (alt filter)"),
    by_branch: z.string().optional().describe("Filter by branch"),
    by_time_interval: z.string().optional().describe("Time interval filter"),
    limit: z.number().optional().describe("Results per page"),
    by_environment: z.string().optional().describe("Filter by environment"),
    by_author: z.string().optional().describe("Filter by author"),
    by_commit: z.string().optional().describe("Filter by commit"),
    page: z.number().optional().describe("Page number"),
    get_all: z.boolean().optional().describe("Get all results"),
  },
  async (args) => asToolResult(await handleListTestCases(args as any)),
);

server.tool(
  "get_testcase_details",
  "Gets detailed test case information including error messages, stack traces, and logs",
  {
    projectId: z.string().describe("Project ID"),
    testcase_id: z.string().optional().describe("Test case ID"),
    testcase_name: z.string().optional().describe("Test case name"),
    testrun_id: z.string().optional().describe("Test run ID"),
    counter: z.number().optional().describe("Test run counter"),
  },
  async (args) => asToolResult(await handleGetTestCaseDetails(args)),
);

server.tool(
  "debug_testcase",
  "Fetches historical failure data for AI-assisted debugging",
  {
    projectId: z.string().describe("Project ID"),
    testcase_name: z.string().describe("Test case name"),
  },
  async (args) => asToolResult(await handleDebugTestCase(args)),
);

server.tool(
  "list_manual_test_cases",
  "Lists and filters manual test cases",
  {
    projectId: z.string().describe("Project ID"),
    search: z.string().optional().describe("Search query"),
    suiteId: z.string().optional().describe("Suite ID filter"),
    status: z.string().optional().describe("Status: actual, draft, deprecated"),
    priority: z.string().optional().describe("Priority: critical, high, medium, low"),
    severity: z.string().optional().describe("Severity: critical, major, minor, trivial"),
    type: z.string().optional().describe("Type: functional, smoke, regression, etc."),
    layer: z.string().optional().describe("Layer: e2e, api, unit"),
    behavior: z.string().optional().describe("Behavior: positive, negative, destructive"),
    automationStatus: z.string().optional().describe("Automation: automated, manual, not_automated"),
    tags: z.string().optional().describe("Tags filter"),
    isFlaky: z.boolean().optional().describe("Filter flaky tests"),
    limit: z.number().optional().describe("Results limit"),
  },
  async (args) => asToolResult(await handleListManualTestCases(args as any)),
);

server.tool(
  "get_manual_test_case",
  "Gets detailed manual test case information",
  {
    projectId: z.string().describe("Project ID"),
    caseId: z.string().describe("Test case ID"),
  },
  async (args) => asToolResult(await handleGetManualTestCase(args)),
);

server.tool(
  "create_manual_test_case",
  "Creates a new manual test case",
  {
    projectId: z.string().describe("Project ID"),
    title: z.string().describe("Test case title"),
    suiteId: z.string().describe("Suite ID"),
    description: z.string().optional().describe("Description"),
    preconditions: z.string().optional().describe("Preconditions"),
    postconditions: z.string().optional().describe("Postconditions"),
    steps: z.array(z.object({ action: z.string(), expectedResult: z.string(), data: z.string().optional() })).optional().describe("Test steps"),
    priority: z.string().optional().describe("Priority"),
    severity: z.string().optional().describe("Severity"),
    type: z.string().optional().describe("Type"),
    layer: z.string().optional().describe("Layer"),
    behavior: z.string().optional().describe("Behavior"),
  },
  async (args) => asToolResult(await handleCreateManualTestCase(args as any)),
);

server.tool(
  "update_manual_test_case",
  "Updates an existing manual test case",
  {
    projectId: z.string().describe("Project ID"),
    caseId: z.string().describe("Test case ID"),
    updates: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      preconditions: z.string().optional(),
      postconditions: z.string().optional(),
      steps: z.array(z.object({ action: z.string(), expectedResult: z.string(), data: z.string().optional() })).optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      severity: z.string().optional(),
      type: z.string().optional(),
      layer: z.string().optional(),
      behavior: z.string().optional(),
    }).describe("Fields to update"),
  },
  async (args) => asToolResult(await handleUpdateManualTestCase(args as any)),
);

server.tool(
  "list_manual_test_suites",
  "Lists test suite hierarchy",
  {
    projectId: z.string().describe("Project ID"),
    parentSuiteId: z.string().optional().describe("Parent suite ID"),
  },
  async (args) => asToolResult(await handleListManualTestSuites(args)),
);

server.tool(
  "create_manual_test_suite",
  "Creates a new test suite",
  {
    projectId: z.string().describe("Project ID"),
    name: z.string().describe("Suite name"),
    parentSuiteId: z.string().optional().describe("Parent suite ID for nesting"),
  },
  async (args) => asToolResult(await handleCreateManualTestSuite(args)),
);

// ════════════════════════════════════════════════════════════
// UI Tool — single entry point + internal action routing
// ════════════════════════════════════════════════════════════

registerAppTool(
  server,
  "show_testdino",
  {
    title: "TestDino",
    description:
      "Opens the TestDino interactive dashboard. Browse test runs, drill into run details, view test cases, analyze failures, and explore manual test cases — all from one place. Omit projectId to show an org/project picker first.",
    inputSchema: {
      // ── Visible to the model ──────────────────────────────
      projectId: z.string().optional().describe("Project ID — omit to show org/project picker"),
      by_branch: z.string().optional().describe("Filter by branch"),
      by_time_interval: z.string().optional().describe("Time range: 1d, 3d, weekly, monthly"),
      // ── Internal UI routing (React app only) ─────────────
      _action: z.enum([
        "fetch_testruns",
        "fetch_run_details",
        "fetch_testcases",
        "fetch_debug",
        "fetch_manual_testcases",
      ]).optional(),
      testrun_id: z.string().optional(),
      counter: z.number().optional(),
      by_status: z.string().optional(),
      testcase_name: z.string().optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      suiteId: z.string().optional(),
    },
    _meta: { ui: { resourceUri } },
  },
  async (args): Promise<CallToolResult> => {
    const pid = args.projectId;

    // ── Internal data-fetch actions (React UI only) ────────
    // These return data WITHOUT a view field so ontoolresult
    // does not reset the current view.
    if (args._action && pid) {
      try {
        switch (args._action) {
          case "fetch_testruns": {
            const data = parseHandlerResult(await handleListTestRuns({
              projectId: pid, by_branch: args.by_branch, by_time_interval: args.by_time_interval,
            }));
            const testruns = extractArray(data).map(flattenRun);
            return { content: [{ type: "text", text: JSON.stringify({ testruns }, null, 2) }], structuredContent: { testruns } } as CallToolResult;
          }
          case "fetch_run_details": {
            const raw = parseHandlerResult(await handleGetRunDetails({ projectId: pid, testrun_id: args.testrun_id, counter: args.counter })) as any;
            const testRun = raw?.data?.testRun || raw;
            const testSuites = raw?.data?.testSuites || [];
            const flatRun = {
              ...testRun,
              passed: testRun?.testStats?.passed, failed: testRun?.testStats?.failed,
              skipped: testRun?.testStats?.skipped, flaky: testRun?.testStats?.flaky,
              total: testRun?.testStats?.total,
              branch: testRun?.metadata?.git?.branch,
              commit: testRun?.metadata?.git?.commit?.hash,
              author: testRun?.metadata?.git?.commit?.author,
              suites: testSuites,
            };
            return { content: [{ type: "text", text: JSON.stringify({ runDetails: flatRun }, null, 2) }], structuredContent: { runDetails: flatRun } } as CallToolResult;
          }
          case "fetch_testcases": {
            const data = parseHandlerResult(await handleListTestCases({
              projectId: pid, by_testrun_id: args.testrun_id, counter: args.counter, by_status: args.by_status,
            } as any));
            const testcases = extractArray(data);
            return { content: [{ type: "text", text: JSON.stringify({ testcases }, null, 2) }], structuredContent: { testcases } } as CallToolResult;
          }
          case "fetch_debug": {
            const raw = parseHandlerResult(await handleDebugTestCase({ projectId: pid, testcase_name: args.testcase_name! })) as any;
            // API returns flat: { Prompt, test_metadata, historical_data } — NOT nested under data
            const debugData = {
              history: raw?.historical_data || raw?.data?.historical_data || [],
              debugging_prompt: raw?.Prompt || raw?.data?.debugging_prompt || "",
              ...(raw?.test_metadata || raw?.data?.test_metadata || {}),
            };
            return { content: [{ type: "text", text: JSON.stringify({ debugData }, null, 2) }], structuredContent: { debugData } } as CallToolResult;
          }
          case "fetch_manual_testcases": {
            const data = parseHandlerResult(await handleListManualTestCases({
              projectId: pid, search: args.search, status: args.status, priority: args.priority, suiteId: args.suiteId,
            } as any));
            const manualCases = extractArray(data);
            return { content: [{ type: "text", text: JSON.stringify({ manualCases }, null, 2) }], structuredContent: { manualCases } } as CallToolResult;
          }
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        return { content: [{ type: "text", text: error }], structuredContent: { error } } as CallToolResult;
      }
    }

    // ── No projectId → org/project picker ─────────────────
    if (!pid) {
      try {
        const orgs = await fetchOrgsAndProjects();
        const isWebClient = !!process.env.TESTDINO_IS_HTTP;
        const payload = { view: "project-picker", orgs, isWebClient };
        return {
          content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload,
        } as CallToolResult;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        const isWebClient = !!process.env.TESTDINO_IS_HTTP;
        const payload = { view: "project-picker", orgs: [], error, isWebClient };
        return { content: [{ type: "text", text: error }], structuredContent: payload } as CallToolResult;
      }
    }

    // ── With projectId → dashboard ─────────────────────────
    try {
      const data = parseHandlerResult(await handleListTestRuns({ projectId: pid, by_branch: args.by_branch, by_time_interval: args.by_time_interval }));
      const testruns = extractArray(data).map(flattenRun);
      const isWebClient = !!process.env.TESTDINO_IS_HTTP;
      const payload = { view: "dashboard", projectId: pid, testruns, filters: { branch: args.by_branch, timeInterval: args.by_time_interval }, isWebClient };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      } as CallToolResult;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      const payload = { view: "dashboard", projectId: pid, testruns: [], error };
      return { content: [{ type: "text", text: error }], structuredContent: payload } as CallToolResult;
    }
  },
);

// ════════════════════════════════════════════════════════════
// Resource: Bundled HTML UI
// ════════════════════════════════════════════════════════════

registerAppResource(
  server,
  "TestDino Dashboard",
  resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
    return {
      contents: [
        {
          uri: resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          metadata: {
            ui: {
              csp: {
                connectDomains: ["https://api.testdino.com", "http://localhost:3001"],
              },
            },
          },
        },
      ],
    };
  },
);

// ════════════════════════════════════════════════════════════
// Resource: Documentation (preserved from original)
// ════════════════════════════════════════════════════════════

server.resource("testdino-docs", "testdino://docs/skill.md", async () => {
  const docsDir = import.meta.filename.endsWith(".ts")
    ? path.join(import.meta.dirname, "docs")
    : path.join(import.meta.dirname, "..", "docs");
  const content = readFileSync(path.join(docsDir, "skill.md"), "utf-8");
  return {
    contents: [
      {
        uri: "testdino://docs/skill.md",
        mimeType: "text/markdown",
        text: content,
      },
    ],
  };
});

return server;

} // end createServer

// ════════════════════════════════════════════════════════════
// Start server (stdio) — only when run directly, not imported
// ════════════════════════════════════════════════════════════

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
  console.error("TestDino MCP App server running on stdio");
}
