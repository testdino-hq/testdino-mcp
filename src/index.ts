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
  uploadLatestLocalTestRunsTool,
  handleUploadLatestLocalTestRuns,
  listTestCasesTool,
  handleListTestCases,
  getTestCaseDetailsTool,
  handleGetTestCaseDetails,
} from "./tools/index.js";

async function main() {
  const server = new Server(
    {
      name: "testdino-mcp",
      version: "1.0.1",
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
    uploadLatestLocalTestRunsTool,
    listTestCasesTool,
    getTestCaseDetailsTool,
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

    if (name === "upload_latest_local_test_runs") {
      return await handleUploadLatestLocalTestRuns(args);
    }

    if (name === "list_testcase") {
      return await handleListTestCases(args);
    }

    if (name === "get_testcase_details") {
      return await handleGetTestCaseDetails(args);
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
