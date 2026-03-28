import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
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
} from "../../src/tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// All tool names as registered in server
const ALL_TOOL_NAMES = [
  "health",
  "list_testruns",
  "get_run_details",
  "list_testcase",
  "get_testcase_details",
  "debug_testcase",
  "list_manual_test_cases",
  "get_manual_test_case",
  "create_manual_test_case",
  "update_manual_test_case",
  "list_manual_test_suites",
  "create_manual_test_suite",
];

function createServer() {
  const tools = [
    healthTool,
    listTestRunsTool,
    getRunDetailsTool,
    listTestCasesTool,
    getTestCaseDetailsTool,
    debugTestCaseTool,
    listManualTestCasesTool,
    getManualTestCaseTool,
    createManualTestCaseTool,
    updateManualTestCaseTool,
    listManualTestSuitesTool,
    createManualTestSuiteTool,
  ];

  const server = new Server(
    { name: "@testdino/mcp", version: "1.0.7" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));

  server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: [
      {
        uri: "testdino://docs/SKILL.md",
        name: "TestDino MCP Skills Guide",
        description: "AI agent guide for using TestDino MCP tools",
        mimeType: "text/markdown",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    const { uri } = request.params;
    if (uri === "testdino://docs/SKILL.md") {
      const skillPath = join(__dirname, "..", "..", "docs", "SKILL.md");
      const content = readFileSync(skillPath, "utf-8");
      return {
        contents: [{ uri, mimeType: "text/markdown", text: content }],
      };
    }
    throw new Error(`Unknown resource: ${uri}`);
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
    it("should expose all 12 tools", async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toHaveLength(12);
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
    it("should expose the SKILL.md resource", async () => {
      const result = await client.listResources();
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toBe("testdino://docs/SKILL.md");
      expect(result.resources[0].mimeType).toBe("text/markdown");
    });
  });

  describe("resource reading", () => {
    it("should return SKILL.md content", async () => {
      const result = await client.readResource({
        uri: "testdino://docs/SKILL.md",
      });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain("TestDino");
      expect(result.contents[0].mimeType).toBe("text/markdown");
    });

    it("should throw for unknown resource URI", async () => {
      await expect(
        client.readResource({ uri: "testdino://docs/nonexistent.md" })
      ).rejects.toThrow();
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
    default:
      return base;
  }
}
