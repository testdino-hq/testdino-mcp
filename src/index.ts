#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
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
  // Releases
  listReleasesTool,
  handleListReleases,
  getReleaseTool,
  handleGetRelease,
  createReleaseTool,
  handleCreateRelease,
  updateReleaseTool,
  handleUpdateRelease,
  // Manual runs
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
  // Sessions
  listSessionsTool,
  handleListSessions,
  getSessionTool,
  handleGetSession,
  createSessionTool,
  handleCreateSession,
  updateSessionTool,
  handleUpdateSession,
  // Error clusters
  getRunErrorClustersTool,
  handleGetRunErrorClusters,
  // Integrations
  getIntegrationStatusTool,
  handleGetIntegrationStatus,
  connectIntegrationTool,
  handleConnectIntegration,
  createExternalIssueTool,
  handleCreateExternalIssue,
  getExternalIssueTool,
  handleGetExternalIssue,
} from "./tools/index.js";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Skills guide surface — kept in lock-step with the streaming MCP server, which
// exposes the SAME resource URI (`testdino://skills/guide`) and the SAME
// zero-arg prompt (`testdino_guide`). Both serve docs/skill.md verbatim.
const SKILLS_GUIDE_URI = "testdino://skills/guide";
// Backward-compatible alias for the pre-1.1.0 URI, still accepted on read.
const LEGACY_SKILLS_URI = "testdino://docs/skill.md";
const SKILLS_PROMPT_NAME = "testdino_guide";
const SKILLS_DESCRIPTION =
  "TestDino AI agent skills guide — tool selection rules, decision trees, " +
  "workflow patterns, and the TestDino audit protocol. Read this before " +
  "making any TestDino tool calls.";

function readSkillsGuide(): string {
  const skillPath = join(__dirname, "..", "docs", "skill.md");
  return readFileSync(skillPath, "utf-8");
}

async function main() {
  const server = new Server(
    {
      name: "@testdino/mcp",
      version: "1.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
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
    getAuditReportTool,
    submitAuditReportTool,
    listManualTestCasesTool,
    getManualTestCaseTool,
    createManualTestCaseTool,
    updateManualTestCaseTool,
    listManualTestSuitesTool,
    createManualTestSuiteTool,
    // Releases
    listReleasesTool,
    getReleaseTool,
    createReleaseTool,
    updateReleaseTool,
    // Manual runs
    listManualRunsTool,
    getManualRunTool,
    createManualRunTool,
    updateManualRunTool,
    listRunTestCasesTool,
    updateRunTestCaseTool,
    // Sessions
    listSessionsTool,
    getSessionTool,
    createSessionTool,
    updateSessionTool,
    // Error clusters
    getRunErrorClustersTool,
    // Integrations
    getIntegrationStatusTool,
    connectIntegrationTool,
    createExternalIssueTool,
    getExternalIssueTool,
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
          uri: SKILLS_GUIDE_URI,
          name: "testdino_skills_guide",
          description: SKILLS_DESCRIPTION,
          mimeType: "text/markdown",
        },
      ],
    };
  });

  /**
   * Read resource content
   */
  server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    const { uri } = request.params;

    if (uri === SKILLS_GUIDE_URI || uri === LEGACY_SKILLS_URI) {
      let content: string;

      try {
        content = readSkillsGuide();
      } catch {
        throw new McpError(
          ErrorCode.InternalError,
          `Resource unavailable: ${SKILLS_GUIDE_URI}`
        );
      }

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

    throw new McpError(ErrorCode.InvalidParams, `Resource ${uri} not found`);
  });

  /**
   * List available prompts — mirrors the streaming MCP server's `testdino_guide`
   * prompt so clients (e.g. Claude Desktop) can auto-inject the skills guide.
   */
  server.setRequestHandler(ListPromptsRequestSchema, () => {
    return {
      prompts: [
        {
          name: SKILLS_PROMPT_NAME,
          description: SKILLS_DESCRIPTION,
        },
      ],
    };
  });

  /**
   * Return the skills guide as a prompt message.
   */
  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const { name } = request.params;

    if (name === SKILLS_PROMPT_NAME) {
      let content: string;

      try {
        content = readSkillsGuide();
      } catch {
        throw new McpError(
          ErrorCode.InternalError,
          `Prompt unavailable: ${SKILLS_PROMPT_NAME}`
        );
      }

      return {
        description: SKILLS_DESCRIPTION,
        messages: [
          {
            role: "user",
            content: { type: "text", text: content },
          },
        ],
      };
    }

    throw new McpError(ErrorCode.InvalidParams, `Prompt ${name} not found`);
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

    if (name === "get_audit_report") {
      return await handleGetAuditReport(
        args as Parameters<typeof handleGetAuditReport>[0]
      );
    }

    if (name === "submit_audit_report") {
      return await handleSubmitAuditReport(
        args as Parameters<typeof handleSubmitAuditReport>[0]
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

    // Releases
    if (name === "list_releases") {
      return await handleListReleases(
        args as Parameters<typeof handleListReleases>[0]
      );
    }
    if (name === "get_release") {
      return await handleGetRelease(
        args as Parameters<typeof handleGetRelease>[0]
      );
    }
    if (name === "create_release") {
      return await handleCreateRelease(
        args as Parameters<typeof handleCreateRelease>[0]
      );
    }
    if (name === "update_release") {
      return await handleUpdateRelease(
        args as Parameters<typeof handleUpdateRelease>[0]
      );
    }

    // Manual runs
    if (name === "list_manual_runs") {
      return await handleListManualRuns(
        args as Parameters<typeof handleListManualRuns>[0]
      );
    }
    if (name === "get_manual_run") {
      return await handleGetManualRun(
        args as Parameters<typeof handleGetManualRun>[0]
      );
    }
    if (name === "create_manual_run") {
      return await handleCreateManualRun(
        args as Parameters<typeof handleCreateManualRun>[0]
      );
    }
    if (name === "update_manual_run") {
      return await handleUpdateManualRun(
        args as Parameters<typeof handleUpdateManualRun>[0]
      );
    }
    if (name === "list_run_test_cases") {
      return await handleListRunTestCases(
        args as Parameters<typeof handleListRunTestCases>[0]
      );
    }
    if (name === "update_run_test_case") {
      return await handleUpdateRunTestCase(
        args as Parameters<typeof handleUpdateRunTestCase>[0]
      );
    }

    // Sessions
    if (name === "list_sessions") {
      return await handleListSessions(
        args as Parameters<typeof handleListSessions>[0]
      );
    }
    if (name === "get_session") {
      return await handleGetSession(
        args as Parameters<typeof handleGetSession>[0]
      );
    }
    if (name === "create_session") {
      return await handleCreateSession(
        args as Parameters<typeof handleCreateSession>[0]
      );
    }
    if (name === "update_session") {
      return await handleUpdateSession(
        args as Parameters<typeof handleUpdateSession>[0]
      );
    }

    // Error clusters
    if (name === "get_run_error_clusters") {
      return await handleGetRunErrorClusters(
        args as Parameters<typeof handleGetRunErrorClusters>[0]
      );
    }

    // Integrations
    if (name === "get_integration_status") {
      return await handleGetIntegrationStatus(
        args as Parameters<typeof handleGetIntegrationStatus>[0]
      );
    }
    if (name === "connect_integration") {
      return await handleConnectIntegration(
        args as Parameters<typeof handleConnectIntegration>[0]
      );
    }
    if (name === "create_external_issue") {
      return await handleCreateExternalIssue(
        args as Parameters<typeof handleCreateExternalIssue>[0]
      );
    }
    if (name === "get_external_issue") {
      return await handleGetExternalIssue(
        args as Parameters<typeof handleGetExternalIssue>[0]
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
