#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
} from "./tools/index.js";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const server = new Server(
    {
      name: "@testdino/mcp",
      version: "1.0.4",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
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
    debugTestCaseTool,
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
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return { tools };
  });

  /**
   * List available resources (documentation files)
   */
  server.setRequestHandler(ListResourcesRequestSchema, () => {
    return {
      resources: [
        {
          uri: "testdino://docs/skill.md",
          name: "TestDino MCP Skills Guide",
          description: "AI agent guide for using TestDino MCP tools - patterns, workflows, and best practices",
          mimeType: "text/markdown",
        }
      ],
    };
  });

  /**
   * Read resource content
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === "testdino://docs/skill.md") {
      const skillPath = join(__dirname, "..", "docs", "skill.md");
      const content = readFileSync(skillPath, "utf-8");
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: content,
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
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
      return await handleListTestRuns(
        args as Parameters<typeof handleListTestRuns>[0]
      );
    }

    if (name === "get_run_details") {
      return await handleGetRunDetails(
        args as Parameters<typeof handleGetRunDetails>[0]
      );
    }

    if (name === "list_testcase") {
      return await handleListTestCases(
        args as Parameters<typeof handleListTestCases>[0]
      );
    }

    if (name === "get_testcase_details") {
      return await handleGetTestCaseDetails(
        args as Parameters<typeof handleGetTestCaseDetails>[0]
      );
    }

    if (name === "debug_testcase") {
      return await handleDebugTestCase(
        args as Parameters<typeof handleDebugTestCase>[0]
      );
    }

    if (name === "list_manual_test_cases") {
      return await handleListManualTestCases(
        args as Parameters<typeof handleListManualTestCases>[0]
      );
    }

    if (name === "get_manual_test_case") {
      return await handleGetManualTestCase(
        args as Parameters<typeof handleGetManualTestCase>[0]
      );
    }

    if (name === "create_manual_test_case") {
      return await handleCreateManualTestCase(
        args as Parameters<typeof handleCreateManualTestCase>[0]
      );
    }

    if (name === "update_manual_test_case") {
      return await handleUpdateManualTestCase(
        args as Parameters<typeof handleUpdateManualTestCase>[0]
      );
    }

    if (name === "list_manual_test_suites") {
      return await handleListManualTestSuites(
        args as Parameters<typeof handleListManualTestSuites>[0]
      );
    }

    if (name === "create_manual_test_suite") {
      return await handleCreateManualTestSuite(
        args as Parameters<typeof handleCreateManualTestSuite>[0]
      );
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
