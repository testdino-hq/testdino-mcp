#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tools
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
} from "./tools/index.js";

async function main() {
  const server = new Server(
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

  /**
   * Define all available tools
   */
  const tools = [
    healthTool,
    listTestRunsTool,
    getRunDetailsTool,
    listTestCasesTool,
    getTestCaseDetailsTool,
    listManualTestCasesTool,
    getManualTestCaseTool,
    createManualTestCaseTool,
    updateManualTestCaseTool,
    listManualTestSuitesTool,
    createManualTestSuiteTool,
  ];

  /**
   * Respond to tool listing
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  /**
   * Handle tool calls
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Route to appropriate tool handler
    if (name === "health") {
      return await handleHealth(args);
    }

    if (name === "list_testruns") {
      return await handleListTestRuns(args);
    }

    if (name === "get_run_details") {
      return await handleGetRunDetails(args);
    }

    if (name === "list_testcase") {
      return await handleListTestCases(args);
    }

    if (name === "get_testcase_details") {
      return await handleGetTestCaseDetails(args);
    }

    if (name === "list_manual_test_cases") {
      return await handleListManualTestCases(args);
    }

    if (name === "get_manual_test_case") {
      return await handleGetManualTestCase(args);
    }

    if (name === "create_manual_test_case") {
      return await handleCreateManualTestCase(args);
    }

    if (name === "update_manual_test_case") {
      return await handleUpdateManualTestCase(args);
    }

    if (name === "list_manual_test_suites") {
      return await handleListManualTestSuites(args);
    }

    if (name === "create_manual_test_suite") {
      return await handleCreateManualTestSuite(args);
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("TestDino MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
