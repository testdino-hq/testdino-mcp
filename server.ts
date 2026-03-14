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
import { z } from "zod";

// Import existing tool handlers
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
} from "./src/tools/index.js";

// The existing handlers return { content: [{ type: string, text: string }] }
// but McpServer expects { type: "text" } literal. This helper casts the result.
function asToolResult(result: { content: { type: string; text: string }[] }): CallToolResult {
  return result as unknown as CallToolResult;
}

// Parse handler result text and extract array data.
// The API may return a raw array, or an object like { testRuns: [...], pagination: {...} }.
// This helper finds the first array value in the response.
function extractArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value)) return value;
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

const server = new McpServer({
  name: "@testdino/mcp",
  version: "2.0.0",
});

const resourceUri = "ui://testdino/app.html";

// ════════════════════════════════════════════════════════════
// Existing tools (registered normally — backward compatible)
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
    steps: z
      .array(
        z.object({
          action: z.string(),
          expectedResult: z.string(),
          data: z.string().optional(),
        }),
      )
      .optional()
      .describe("Test steps"),
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
    updates: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        preconditions: z.string().optional(),
        postconditions: z.string().optional(),
        steps: z
          .array(z.object({ action: z.string(), expectedResult: z.string(), data: z.string().optional() }))
          .optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        severity: z.string().optional(),
        type: z.string().optional(),
        layer: z.string().optional(),
        behavior: z.string().optional(),
      })
      .describe("Fields to update"),
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
// UI-Enabled Tools (MCP App)
// ════════════════════════════════════════════════════════════

registerAppTool(
  server,
  "show_test_dashboard",
  {
    title: "Test Run Dashboard",
    description:
      "Shows an interactive dashboard of test runs for a project. Displays pass/fail stats, trends, and lets users drill into individual runs.",
    inputSchema: {
      projectId: z.string().describe("Project ID"),
      by_branch: z.string().optional().describe("Filter by branch"),
      by_time_interval: z.string().optional().describe("Time range: 1d, 3d, weekly, monthly"),
    },
    _meta: { ui: { resourceUri } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleListTestRuns(args));
      const testruns = extractArray(data);
      return {
        content: [{ type: "text", text: `Showing ${testruns.length} test runs for project ${args.projectId}` }],
        structuredContent: {
          view: "dashboard",
          projectId: args.projectId,
          testruns,
          filters: { branch: args.by_branch, timeInterval: args.by_time_interval },
        },
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: error }],
        structuredContent: { view: "dashboard", projectId: args.projectId, testruns: [], error },
      };
    }
  },
);

registerAppTool(
  server,
  "show_test_run",
  {
    title: "Test Run Details",
    description: "Shows a detailed interactive view of a specific test run with statistics, suites, and test cases.",
    inputSchema: {
      projectId: z.string().describe("Project ID"),
      testrun_id: z.string().optional().describe("Test run ID"),
      counter: z.number().optional().describe("Test run counter number"),
    },
    _meta: { ui: { resourceUri } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleGetRunDetails(args));
      return {
        content: [{ type: "text", text: `Test run details for ${args.testrun_id || args.counter}` }],
        structuredContent: { view: "run-detail", projectId: args.projectId, runDetails: data, runId: args.testrun_id },
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: error }],
        structuredContent: { view: "run-detail", projectId: args.projectId, runDetails: null, error },
      };
    }
  },
);

registerAppTool(
  server,
  "show_test_failures",
  {
    title: "Failure Analysis",
    description:
      "Shows interactive failure analysis with error patterns, history, and AI debugging suggestions for a test case.",
    inputSchema: {
      projectId: z.string().describe("Project ID"),
      testcase_name: z.string().describe("Test case name to analyze"),
    },
    _meta: { ui: { resourceUri } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleDebugTestCase(args));
      return {
        content: [{ type: "text", text: `Failure analysis for: ${args.testcase_name}` }],
        structuredContent: { view: "failures", projectId: args.projectId, debugData: data, testcaseName: args.testcase_name },
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: error }],
        structuredContent: { view: "failures", projectId: args.projectId, debugData: null, testcaseName: args.testcase_name, error },
      };
    }
  },
);

registerAppTool(
  server,
  "show_test_cases",
  {
    title: "Test Cases View",
    description: "Shows an interactive list of test cases for a test run with status, duration, and debug actions.",
    inputSchema: {
      projectId: z.string().describe("Project ID"),
      by_testrun_id: z.string().optional().describe("Test run ID"),
      counter: z.number().optional().describe("Test run counter"),
      by_status: z.string().optional().describe("Filter: passed, failed, skipped, flaky"),
    },
    _meta: { ui: { resourceUri } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleListTestCases(args as any));
      return {
        content: [{ type: "text", text: `Test cases for project ${args.projectId}` }],
        structuredContent: { view: "testcases", projectId: args.projectId, testcases: extractArray(data) },
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: error }],
        structuredContent: { view: "testcases", projectId: args.projectId, testcases: [], error },
      };
    }
  },
);

registerAppTool(
  server,
  "show_manual_test_cases",
  {
    title: "Manual Test Cases",
    description: "Shows an interactive list of manual test cases with priority, status, and type information.",
    inputSchema: {
      projectId: z.string().describe("Project ID"),
      search: z.string().optional().describe("Search query"),
      status: z.string().optional().describe("Status: actual, draft, deprecated"),
      priority: z.string().optional().describe("Priority: critical, high, medium, low"),
    },
    _meta: { ui: { resourceUri } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleListManualTestCases(args as any));
      return {
        content: [{ type: "text", text: `Manual test cases for project ${args.projectId}` }],
        structuredContent: { view: "manual-cases", projectId: args.projectId, manualCases: extractArray(data) },
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: error }],
        structuredContent: { view: "manual-cases", projectId: args.projectId, manualCases: [], error },
      };
    }
  },
);

// ════════════════════════════════════════════════════════════
// App-Only Tools (called by the UI, not visible to the model)
// ════════════════════════════════════════════════════════════

registerAppTool(
  server,
  "ui_fetch_testruns",
  {
    description: "Fetches test run data for the UI",
    inputSchema: {
      projectId: z.string(),
      by_branch: z.string().optional(),
      by_time_interval: z.string().optional(),
      limit: z.number().optional(),
      page: z.number().optional(),
    },
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleListTestRuns(args));
      return { content: [{ type: "text", text: "OK" }], structuredContent: { testruns: extractArray(data) } };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { content: [{ type: "text", text: error }], structuredContent: { testruns: [], error } };
    }
  },
);

registerAppTool(
  server,
  "ui_fetch_run_details",
  {
    description: "Fetches test run details for the UI",
    inputSchema: {
      projectId: z.string(),
      testrun_id: z.string().optional(),
      counter: z.number().optional(),
    },
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleGetRunDetails(args));
      return { content: [{ type: "text", text: "OK" }], structuredContent: { runDetails: data } };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { content: [{ type: "text", text: error }], structuredContent: { runDetails: null, error } };
    }
  },
);

registerAppTool(
  server,
  "ui_fetch_testcases",
  {
    description: "Fetches test cases for the UI",
    inputSchema: {
      projectId: z.string(),
      by_testrun_id: z.string().optional(),
      counter: z.number().optional(),
      by_status: z.string().optional(),
    },
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleListTestCases(args as any));
      return { content: [{ type: "text", text: "OK" }], structuredContent: { testcases: extractArray(data) } };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { content: [{ type: "text", text: error }], structuredContent: { testcases: [], error } };
    }
  },
);

registerAppTool(
  server,
  "ui_fetch_debug",
  {
    description: "Fetches debug data for the UI",
    inputSchema: {
      projectId: z.string(),
      testcase_name: z.string(),
    },
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async (args): Promise<CallToolResult> => {
    try {
      const data = parseHandlerResult(await handleDebugTestCase(args));
      return { content: [{ type: "text", text: "OK" }], structuredContent: { debugData: data } };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { content: [{ type: "text", text: error }], structuredContent: { debugData: null, error } };
    }
  },
);

// ════════════════════════════════════════════════════════════
// Resource: Bundled HTML UI
// ════════════════════════════════════════════════════════════

registerAppResource(
  server,
  resourceUri,
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
          _meta: {
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

// ════════════════════════════════════════════════════════════
// Start server
// ════════════════════════════════════════════════════════════

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("TestDino MCP App server running on stdio");
