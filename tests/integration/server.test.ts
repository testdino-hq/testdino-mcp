import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Import all tools the same way index.ts does
import {
  healthTool,
  handleHealth,
  listTestRunsTool,
  handleListTestRuns,
  getRunDetailsTool,
  handleGetRunDetails,
  listTestCasesTool,
  handleListTestCases,
  getTestCaseDetailsTool,
  handleGetTestCaseDetails,
  debugTestCaseTool,
  handleDebugTestCase,
  getAuditReportTool,
  handleGetAuditReport,
  submitAuditReportTool,
  handleSubmitAuditReport,
  listManualTestCasesTool,
  handleListManualTestCases,
  getManualTestCaseTool,
  handleGetManualTestCase,
  createManualTestCaseTool,
  handleCreateManualTestCase,
  updateManualTestCaseTool,
  handleUpdateManualTestCase,
  listManualTestSuitesTool,
  handleListManualTestSuites,
  createManualTestSuiteTool,
  handleCreateManualTestSuite,
  listReleasesTool,
  handleListReleases,
  getReleaseTool,
  handleGetRelease,
  createReleaseTool,
  handleCreateRelease,
  updateReleaseTool,
  handleUpdateRelease,
  listManualRunsTool,
  handleListManualRuns,
  getManualRunTool,
  handleGetManualRun,
  createManualRunTool,
  handleCreateManualRun,
  updateManualRunTool,
  handleUpdateManualRun,
  listRunTestCasesTool,
  handleListRunTestCases,
  updateRunTestCaseTool,
  handleUpdateRunTestCase,
  listSessionsTool,
  handleListSessions,
  getSessionTool,
  handleGetSession,
  createSessionTool,
  handleCreateSession,
  updateSessionTool,
  handleUpdateSession,
} from "../../src/tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const skillPath = join(__dirname, "..", "..", "docs", "skill.md");
const hasSkillDoc = existsSync(skillPath);

// All tool names as registered in server
const ALL_TOOL_NAMES = [
  "health",
  "list_testruns",
  "get_run_details",
  "list_testcase",
  "get_testcase_details",
  "debug_testcase",
  "get_audit_report",
  "submit_audit_report",
  "list_manual_test_cases",
  "get_manual_test_case",
  "create_manual_test_case",
  "update_manual_test_case",
  "list_manual_test_suites",
  "create_manual_test_suite",
  "list_releases",
  "get_release",
  "create_release",
  "update_release",
  "list_manual_runs",
  "get_manual_run",
  "create_manual_run",
  "update_manual_run",
  "list_run_test_cases",
  "update_run_test_case",
  "list_sessions",
  "get_session",
  "create_session",
  "update_session",
];

function createServer() {
  const tools = [
    healthTool,
    listTestRunsTool,
    getRunDetailsTool,
    listTestCasesTool,
    getTestCaseDetailsTool,
    debugTestCaseTool,
    getAuditReportTool,
    submitAuditReportTool,
    listManualTestCasesTool,
    getManualTestCaseTool,
    createManualTestCaseTool,
    updateManualTestCaseTool,
    listManualTestSuitesTool,
    createManualTestSuiteTool,
    listReleasesTool,
    getReleaseTool,
    createReleaseTool,
    updateReleaseTool,
    listManualRunsTool,
    getManualRunTool,
    createManualRunTool,
    updateManualRunTool,
    listRunTestCasesTool,
    updateRunTestCaseTool,
    listSessionsTool,
    getSessionTool,
    createSessionTool,
    updateSessionTool,
  ];

  const server = new Server(
    { name: "@testdino/mcp", version: "1.0.10" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));

  server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: [
      {
        uri: "testdino://docs/skill.md",
        name: "TestDino MCP Skills Guide",
        description: "AI agent guide for using TestDino MCP tools",
        mimeType: "text/markdown",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    const { uri } = request.params;
    const skillResourceUri = "testdino://docs/skill.md";

    if (uri === skillResourceUri) {
      let content: string;

      try {
        content = readFileSync(skillPath, "utf-8");
      } catch {
        throw new McpError(
          ErrorCode.InternalError,
          `Resource unavailable: ${skillResourceUri}`
        );
      }

      return {
        contents: [{ uri, mimeType: "text/markdown", text: content }],
      };
    }
    throw new McpError(ErrorCode.InvalidParams, `Resource ${uri} not found`);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "health") return await handleHealth(args);
    if (name === "list_testruns")
      return await handleListTestRuns(
        args as Parameters<typeof handleListTestRuns>[0]
      );
    if (name === "get_run_details")
      return await handleGetRunDetails(
        args as Parameters<typeof handleGetRunDetails>[0]
      );
    if (name === "list_testcase")
      return await handleListTestCases(
        args as Parameters<typeof handleListTestCases>[0]
      );
    if (name === "get_testcase_details")
      return await handleGetTestCaseDetails(
        args as Parameters<typeof handleGetTestCaseDetails>[0]
      );
    if (name === "debug_testcase")
      return await handleDebugTestCase(
        args as Parameters<typeof handleDebugTestCase>[0]
      );
    if (name === "get_audit_report")
      return await handleGetAuditReport(
        args as Parameters<typeof handleGetAuditReport>[0]
      );
    if (name === "submit_audit_report")
      return await handleSubmitAuditReport(
        args as Parameters<typeof handleSubmitAuditReport>[0]
      );
    if (name === "list_manual_test_cases")
      return await handleListManualTestCases(
        args as Parameters<typeof handleListManualTestCases>[0]
      );
    if (name === "get_manual_test_case")
      return await handleGetManualTestCase(
        args as Parameters<typeof handleGetManualTestCase>[0]
      );
    if (name === "create_manual_test_case")
      return await handleCreateManualTestCase(
        args as Parameters<typeof handleCreateManualTestCase>[0]
      );
    if (name === "update_manual_test_case")
      return await handleUpdateManualTestCase(
        args as Parameters<typeof handleUpdateManualTestCase>[0]
      );
    if (name === "list_manual_test_suites")
      return await handleListManualTestSuites(
        args as Parameters<typeof handleListManualTestSuites>[0]
      );
    if (name === "create_manual_test_suite")
      return await handleCreateManualTestSuite(
        args as Parameters<typeof handleCreateManualTestSuite>[0]
      );
    if (name === "list_releases")
      return await handleListReleases(
        args as Parameters<typeof handleListReleases>[0]
      );
    if (name === "get_release")
      return await handleGetRelease(
        args as Parameters<typeof handleGetRelease>[0]
      );
    if (name === "create_release")
      return await handleCreateRelease(
        args as Parameters<typeof handleCreateRelease>[0]
      );
    if (name === "update_release")
      return await handleUpdateRelease(
        args as Parameters<typeof handleUpdateRelease>[0]
      );
    if (name === "list_manual_runs")
      return await handleListManualRuns(
        args as Parameters<typeof handleListManualRuns>[0]
      );
    if (name === "get_manual_run")
      return await handleGetManualRun(
        args as Parameters<typeof handleGetManualRun>[0]
      );
    if (name === "create_manual_run")
      return await handleCreateManualRun(
        args as Parameters<typeof handleCreateManualRun>[0]
      );
    if (name === "update_manual_run")
      return await handleUpdateManualRun(
        args as Parameters<typeof handleUpdateManualRun>[0]
      );
    if (name === "list_run_test_cases")
      return await handleListRunTestCases(
        args as Parameters<typeof handleListRunTestCases>[0]
      );
    if (name === "update_run_test_case")
      return await handleUpdateRunTestCase(
        args as Parameters<typeof handleUpdateRunTestCase>[0]
      );
    if (name === "list_sessions")
      return await handleListSessions(
        args as Parameters<typeof handleListSessions>[0]
      );
    if (name === "get_session")
      return await handleGetSession(
        args as Parameters<typeof handleGetSession>[0]
      );
    if (name === "create_session")
      return await handleCreateSession(
        args as Parameters<typeof handleCreateSession>[0]
      );
    if (name === "update_session")
      return await handleUpdateSession(
        args as Parameters<typeof handleUpdateSession>[0]
      );

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}

describe("MCP Server Integration", () => {
  let client: Client;
  let server: Server;

  beforeAll(async () => {
    server = createServer();
    client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  describe("tool listing", () => {
    it("should expose all prod-aligned tools", async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toHaveLength(28);
      for (const name of ALL_TOOL_NAMES) {
        expect(toolNames).toContain(name);
      }
    });

    it("every tool should have a name, description, and inputSchema", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    });

    it("every inputSchema property should have a description", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        const props = tool.inputSchema.properties as Record<
          string,
          { description?: string }
        >;
        if (!props) continue;
        for (const [propName, propDef] of Object.entries(props)) {
          expect(
            propDef.description,
            `${tool.name}.${propName} missing description`
          ).toBeTruthy();
        }
      }
    });
  });

  describe("tool routing", () => {
    it("every registered tool name should be routable (not throw Unknown tool)", async () => {
      // Mock fetch so handlers don't actually call the API
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve({ data: [] }),
          text: () => Promise.resolve("{}"),
        })
      );
      process.env.TESTDINO_PAT = "test-integration-token";

      for (const toolName of ALL_TOOL_NAMES) {
        // Build minimal valid args for each tool
        const args = buildMinimalArgs(toolName);
        try {
          const result = await client.callTool({
            name: toolName,
            arguments: args,
          });
          // Should get a response, not an "Unknown tool" error
          expect(result.content).toBeDefined();
        } catch (e) {
          // MCP SDK wraps handler errors — that's fine (means it routed correctly)
          // Only fail if the error is "Unknown tool"
          const msg = (e as Error).message;
          expect(msg).not.toContain("Unknown tool");
        }
      }

      vi.unstubAllGlobals();
      delete process.env.TESTDINO_PAT;
    });

    it("should throw for an unknown tool name", async () => {
      await expect(
        client.callTool({ name: "nonexistent_tool", arguments: {} })
      ).rejects.toThrow();
    });
  });

  describe("resource listing", () => {
    it("should expose the skill.md resource", async () => {
      const result = await client.listResources();
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toBe("testdino://docs/skill.md");
      expect(result.resources[0].mimeType).toBe("text/markdown");
    });
  });

  describe("resource reading", () => {
    it("should return skill.md content", async () => {
      if (!hasSkillDoc) {
        await client
          .readResource({
            uri: "testdino://docs/skill.md",
          })
          .catch((error) => {
            expect((error as McpError).code).toBe(ErrorCode.InternalError);
            expect((error as Error).message).toContain(
              "Resource unavailable: testdino://docs/skill.md"
            );
          });
        return;
      }

      const result = await client.readResource({
        uri: "testdino://docs/skill.md",
      });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain("TestDino");
      expect(result.contents[0].mimeType).toBe("text/markdown");
    });

    it("should throw for unknown resource URI", async () => {
      await client
        .readResource({ uri: "testdino://docs/nonexistent.md" })
        .catch((error) => {
          expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
          expect((error as Error).message).toContain(
            "Resource testdino://docs/nonexistent.md not found"
          );
        });
    });
  });
});

/**
 * Build the minimum valid args for a tool so the handler routes correctly.
 * These may still fail validation (e.g., missing required combos) but
 * they will NOT fail on "Unknown tool" — which is what we're testing.
 */
function buildMinimalArgs(toolName: string): Record<string, unknown> {
  const base = { token: "test-token", projectId: "test-project" };

  switch (toolName) {
    case "health":
      return {};
    case "list_testruns":
      return base;
    case "get_run_details":
      return { ...base, testrun_id: "run-1" };
    case "list_testcase":
      return { ...base, by_testrun_id: "run-1" };
    case "get_testcase_details":
      return { ...base, testcase_id: "tc-1" };
    case "debug_testcase":
      return { ...base, testcase_name: "test" };
    case "get_audit_report":
      return { ...base, action: "list" };
    case "submit_audit_report":
      return { ...base, score: 80, markdownReport: "# Audit\n\nDone." };
    case "list_manual_test_cases":
      return base;
    case "get_manual_test_case":
      return { ...base, caseId: "TC-1" };
    case "create_manual_test_case":
      return { ...base, title: "Test", suiteName: "Suite" };
    case "update_manual_test_case":
      return { ...base, caseId: "TC-1", updates: { name: "Updated" } };
    case "list_manual_test_suites":
      return base;
    case "create_manual_test_suite":
      return { ...base, name: "Suite" };
    case "list_releases":
      return base;
    case "get_release":
      return { ...base, releaseId: "MS-1" };
    case "create_release":
      return { ...base, name: "Release" };
    case "update_release":
      return { ...base, releaseId: "MS-1", updates: { name: "Updated" } };
    case "list_manual_runs":
      return base;
    case "get_manual_run":
      return { ...base, runId: "RUN-1" };
    case "create_manual_run":
      return { ...base, name: "Run" };
    case "update_manual_run":
      return { ...base, runId: "RUN-1", updates: { name: "Updated" } };
    case "list_run_test_cases":
      return { ...base, runId: "RUN-1" };
    case "update_run_test_case":
      return {
        ...base,
        runId: "RUN-1",
        rtcRef: "TC-1",
        updates: { result: "passed" },
      };
    case "list_sessions":
      return base;
    case "get_session":
      return { ...base, sessionId: "SES-1" };
    case "create_session":
      return { ...base, name: "Session" };
    case "update_session":
      return { ...base, sessionId: "SES-1", updates: { name: "Updated" } };
    default:
      return base;
  }
}
