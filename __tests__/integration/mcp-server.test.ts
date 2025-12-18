/**
 * Integration tests for MCP Server
 */

import { jest } from "@jest/globals";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  healthTool,
  handleHealth,
  listTestRunsTool,
  handleListTestRuns,
} from "../../src/tools/index.js";

// Mock tool handlers
jest.mock("../../src/tools/index.js", () => ({
  healthTool: {
    name: "health",
    description: "Health check tool",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  handleHealth: jest.fn(),
  listTestRunsTool: {
    name: "list_testruns",
    description: "List test runs",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
    },
  },
  handleListTestRuns: jest.fn(),
  getRunDetailsTool: { name: "get_run_details" },
  handleGetRunDetails: jest.fn(),
  listTestCasesTool: { name: "list_testcase" },
  handleListTestCases: jest.fn(),
  getTestCaseDetailsTool: { name: "get_testcase_details" },
  handleGetTestCaseDetails: jest.fn(),
  listManualTestCasesTool: { name: "list_manual_test_cases" },
  handleListManualTestCases: jest.fn(),
  getManualTestCaseTool: { name: "get_manual_test_case" },
  handleGetManualTestCase: jest.fn(),
  createManualTestCaseTool: { name: "create_manual_test_case" },
  handleCreateManualTestCase: jest.fn(),
  updateManualTestCaseTool: { name: "update_manual_test_case" },
  handleUpdateManualTestCase: jest.fn(),
  listManualTestSuitesTool: { name: "list_manual_test_suites" },
  handleListManualTestSuites: jest.fn(),
  createManualTestSuiteTool: { name: "create_manual_test_suite" },
  handleCreateManualTestSuite: jest.fn(),
}));

const mockHandleHealth = handleHealth as jest.MockedFunction<typeof handleHealth>;
const mockHandleListTestRuns = handleListTestRuns as jest.MockedFunction<
  typeof handleListTestRuns
>;

describe("MCP Server Integration", () => {
  let server: Server;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new Server(
      {
        name: "@testdino/mcp",
        version: "1.0.3",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  });

  describe("ListToolsRequestSchema", () => {
    test("should return all available tools", async () => {
      const tools = [
        healthTool,
        listTestRunsTool,
        { name: "get_run_details" },
        { name: "list_testcase" },
        { name: "get_testcase_details" },
        { name: "list_manual_test_cases" },
        { name: "get_manual_test_case" },
        { name: "create_manual_test_case" },
        { name: "update_manual_test_case" },
        { name: "list_manual_test_suites" },
        { name: "create_manual_test_suite" },
      ];

      server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools };
      });

      const request = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      const response = await server.request(request, ListToolsRequestSchema);

      expect((response as any).result.tools).toHaveLength(11);
      expect((response as any).result.tools.map((t: any) => t.name)).toContain("health");
      expect((response as any).result.tools.map((t: any) => t.name)).toContain("list_testruns");
    });
  });

  describe("CallToolRequestSchema - Health Tool", () => {
    test("should route health tool calls correctly", async () => {
      const mockResponse = {
        content: [
          {
            type: "text" as const,
            text: "✅ TestDino Connection Successful!",
          },
        ],
      };

      mockHandleHealth.mockResolvedValue(mockResponse);

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        if (name === "health") {
          return await handleHealth(args);
        }
        throw new Error(`Unknown tool: ${name}`);
      });

      const request = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/call",
        params: {
          name: "health",
          arguments: {},
        },
      };

      const response = await server.request(request, CallToolRequestSchema);

      expect(mockHandleHealth).toHaveBeenCalledWith({});
      expect((response as any).content).toEqual(mockResponse.content);
    });
  });

  describe("CallToolRequestSchema - List Test Runs Tool", () => {
    test("should route list_testruns tool calls correctly", async () => {
      const mockResponse = {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, data: { count: 0 } }),
          },
        ],
      };

      mockHandleListTestRuns.mockResolvedValue(mockResponse);

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        if (name === "list_testruns") {
          return await handleListTestRuns(args);
        }
        throw new Error(`Unknown tool: ${name}`);
      });

      const request = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/call",
        params: {
          name: "list_testruns",
          arguments: { projectId: "proj_123" },
        },
      };

      const response = await server.request(request, CallToolRequestSchema);

      expect(mockHandleListTestRuns).toHaveBeenCalledWith({ projectId: "proj_123" });
      expect((response as any).content).toEqual(mockResponse.content);
    });
  });

  describe("Error Handling", () => {
    test("should throw error for unknown tool", async () => {
      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name } = request.params;
        throw new Error(`Unknown tool: ${name}`);
      });

      const request = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/call",
        params: {
          name: "unknown_tool",
          arguments: {},
        },
      };

      await expect(server.request(request, CallToolRequestSchema)).rejects.toThrow(
        "Unknown tool: unknown_tool"
      );
    });
  });
});

