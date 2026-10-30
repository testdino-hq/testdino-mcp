import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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
import { ApiError, apiRequestJson } from "./lib/request.js";
import { endpoints } from "./lib/endpoints.js";
import { getApiKey } from "./lib/env.js";
import { toolResultFromCaptured, type ToolResult } from "./lib/tool-result.js";
import {
  applyHostedTransforms,
  compileValidators,
  strictObjectIssues,
  validationErrorResult,
} from "./lib/validate.js";
import { FIX_PROMPT_TEXT, PROMPTS } from "./prompts/index.js";
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
  AUDIT_REPORT_URI,
  showAuditReportTool,
  handleShowAuditReport,
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
  // Automation links
  listAutomatedTestsTool,
  handleListAutomatedTests,
  getTestCaseLinksTool,
  handleGetTestCaseLinks,
  linkAutomatedTestTool,
  handleLinkAutomatedTest,
  unlinkAutomatedTestTool,
  handleUnlinkAutomatedTest,
  bulkLinkAutomatedTestsTool,
  handleBulkLinkAutomatedTests,
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
  // Re-run
  getRerunSelectionTool,
  handleGetRerunSelection,
  rerunTestTool,
  handleRerunTest,
  // Integrations
  getIntegrationStatusTool,
  handleGetIntegrationStatus,
  connectIntegrationTool,
  handleConnectIntegration,
  createExternalIssueTool,
  handleCreateExternalIssue,
  getExternalIssueTool,
  handleGetExternalIssue,
  // AI Insights
  getAiInsightsTool,
  handleGetAiInsights,
  getTraceAnalysisTool,
  handleGetTraceAnalysis,
  getDebugEvidenceTool,
  handleGetDebugEvidence,
  getFlakeVerdictTool,
  handleGetFlakeVerdict,
  verifyFixTool,
  handleVerifyFix,
  // Test Controls
  listTestControlsTool,
  handleListTestControls,
  getTestControlsTool,
  handleGetTestControls,
  getQuarantineTool,
  handleGetQuarantine,
  quarantineTestsTool,
  handleQuarantineTests,
  updateQuarantineTool,
  handleUpdateQuarantine,
  releaseQuarantineTool,
  handleReleaseQuarantine,
  setTestCriticalTool,
  handleSetTestCritical,
  assignTestTool,
  handleAssignTest,
  watchTestTool,
  handleWatchTest,
  getOrgDetailsTool,
  handleGetOrgDetails,
  getProjectDetailsTool,
  handleGetProjectDetails,
  getPullRequestsTool,
  handleGetPullRequests,
} from "./tools/index.js";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Skills guide surface — kept in lock-step with the streaming MCP server, which
// exposes the SAME resource URI (`testdino://skills/guide`) and the SAME
// zero-arg prompt (`testdino_guide`). Both serve docs/skill.md verbatim.
const SKILLS_GUIDE_URI = "testdino://skills/guide";
const SKILLS_PROMPT_NAME = "testdino_guide";
const SKILLS_DESCRIPTION =
  "TestDino AI agent skills guide — tool selection rules, decision trees, " +
  "workflow patterns, and the TestDino audit protocol. Read this before " +
  "making any TestDino tool calls.";

function readSkillsGuide(): string {
  const skillPath = join(__dirname, "..", "docs", "skill.md");
  return readFileSync(skillPath, "utf-8");
}

// Handlers return the API body as JSON text; re-shaping it here gives the
// hosted server's result (compact text plus structuredContent) for every tool.
function asHostedResult(result: {
  content: { type: string; text?: string }[];
  isError?: boolean;
}): ToolResult {
  const text = result.content[0]?.text;
  if (result.isError || typeof text !== "string") {
    return result as ToolResult;
  }
  try {
    return toolResultFromCaptured(200, JSON.parse(text));
  } catch {
    return toolResultFromCaptured(200, text);
  }
}

// Tools whose route returns the hosted tool result itself, not an API body to reshape.
const PASSTHROUGH_TOOLS = new Set(["show_audit_report"]);

function errorResult(error: unknown): ToolResult {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if (e instanceof ApiError) {
      return toolResultFromCaptured(e.statusCode, e.body);
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: message }], isError: true };
}

export function createServer(): Server {
  const server = new Server(
    {
      name: "@testdino/mcp",
      version: "2.2.3",
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
    getRunErrorClustersTool,
    listTestCasesTool,
    getTestCaseDetailsTool,
    debugTestCaseTool,
    getAuditReportTool,
    submitAuditReportTool,
    showAuditReportTool,
    listManualTestCasesTool,
    getManualTestCaseTool,
    createManualTestCaseTool,
    updateManualTestCaseTool,
    listManualTestSuitesTool,
    createManualTestSuiteTool,
    listAutomatedTestsTool,
    getTestCaseLinksTool,
    linkAutomatedTestTool,
    unlinkAutomatedTestTool,
    bulkLinkAutomatedTestsTool,
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
    getIntegrationStatusTool,
    connectIntegrationTool,
    createExternalIssueTool,
    getExternalIssueTool,
    getTraceAnalysisTool,
    getAiInsightsTool,
    getFlakeVerdictTool,
    getRerunSelectionTool,
    rerunTestTool,
    verifyFixTool,
    getDebugEvidenceTool,
    listTestControlsTool,
    getTestControlsTool,
    getQuarantineTool,
    quarantineTestsTool,
    updateQuarantineTool,
    releaseQuarantineTool,
    setTestCriticalTool,
    assignTestTool,
    watchTestTool,
    getOrgDetailsTool,
    getProjectDetailsTool,
    getPullRequestsTool,
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
        // The MCP Apps audit scorecard, listed exactly as the hosted resources/list lists it.
        {
          name: "testdino_audit_report_view",
          title: "TestDino audit scorecard",
          uri: "ui://testdino/audit-report/v1",
          description:
            "Scorecard view of a saved TestDino Playwright audit report.",
          mimeType: "text/html;profile=mcp-app",
          _meta: {
            ui: {
              csp: {},
              prefersBorder: false,
            },
          },
        },
      ],
    };
  });

  /**
   * Read resource content
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // The card's HTML comes from the hosted MCP, so the package never carries its own copy.
    if (uri === AUDIT_REPORT_URI) {
      const token = getApiKey();
      try {
        return await apiRequestJson<{ contents: unknown[] }>(
          endpoints.auditCardResource(),
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        throw new McpError(
          ErrorCode.InternalError,
          `Resource unavailable: ${AUDIT_REPORT_URI}`
        );
      }
    }

    if (uri === SKILLS_GUIDE_URI) {
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

  server.setRequestHandler(ListPromptsRequestSchema, () => ({
    prompts: PROMPTS,
  }));

  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const { name } = request.params;
    const args = request.params.arguments ?? {};

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
        messages: [{ role: "user", content: { type: "text", text: content } }],
      };
    }

    const buildText = FIX_PROMPT_TEXT[name];
    const prompt = PROMPTS.find((p) => p.name === name);
    if (!buildText || !prompt) {
      throw new McpError(ErrorCode.InvalidParams, `Prompt ${name} not found`);
    }
    const missing = (prompt.arguments ?? [])
      .filter((a) => a.required && typeof args[a.name] !== "string")
      .map((a) => a.name);
    if (missing.length > 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments for prompt ${name}: ${missing.join(", ")} required`
      );
    }
    return {
      messages: [
        { role: "user", content: { type: "text", text: buildText(args) } },
      ],
    };
  });

  /**
   * Handle tool calls
   */
  const dispatch = async (
    name: string,
    args: Record<string, unknown> | undefined
  ) => {
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

    if (name === "show_audit_report") {
      return await handleShowAuditReport(
        args as Parameters<typeof handleShowAuditReport>[0]
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

    if (name === "list_automated_tests") {
      return await handleListAutomatedTests(
        args as Parameters<typeof handleListAutomatedTests>[0]
      );
    }

    if (name === "get_test_case_links") {
      return await handleGetTestCaseLinks(
        args as Parameters<typeof handleGetTestCaseLinks>[0]
      );
    }

    if (name === "link_automated_test") {
      return await handleLinkAutomatedTest(
        args as Parameters<typeof handleLinkAutomatedTest>[0]
      );
    }

    if (name === "unlink_automated_test") {
      return await handleUnlinkAutomatedTest(
        args as Parameters<typeof handleUnlinkAutomatedTest>[0]
      );
    }

    if (name === "bulk_link_automated_tests") {
      return await handleBulkLinkAutomatedTests(
        args as Parameters<typeof handleBulkLinkAutomatedTests>[0]
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

    // Re-run
    if (name === "get_rerun_selection") {
      return await handleGetRerunSelection(
        args as Parameters<typeof handleGetRerunSelection>[0]
      );
    }

    if (name === "rerun_test") {
      return await handleRerunTest(
        args as Parameters<typeof handleRerunTest>[0]
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

    // Debug ladder
    if (name === "get_debug_evidence") {
      return await handleGetDebugEvidence(
        args as Parameters<typeof handleGetDebugEvidence>[0]
      );
    }
    if (name === "get_flake_verdict") {
      return await handleGetFlakeVerdict(
        args as Parameters<typeof handleGetFlakeVerdict>[0]
      );
    }
    if (name === "verify_fix") {
      return await handleVerifyFix(
        args as Parameters<typeof handleVerifyFix>[0]
      );
    }

    // AI Insights
    if (name === "get_trace_analysis") {
      return await handleGetTraceAnalysis(
        args as Parameters<typeof handleGetTraceAnalysis>[0]
      );
    }
    if (name === "get_ai_insights") {
      return await handleGetAiInsights(
        args as Parameters<typeof handleGetAiInsights>[0]
      );
    }

    // Test Controls
    if (name === "list_test_controls") {
      return await handleListTestControls(args);
    }
    if (name === "get_test_controls") {
      return await handleGetTestControls(args);
    }
    if (name === "get_quarantine") {
      return await handleGetQuarantine(args);
    }
    if (name === "quarantine_tests") {
      return await handleQuarantineTests(args);
    }
    if (name === "update_quarantine") {
      return await handleUpdateQuarantine(args);
    }
    if (name === "release_quarantine") {
      return await handleReleaseQuarantine(args);
    }
    if (name === "set_test_critical") {
      return await handleSetTestCritical(args);
    }
    if (name === "assign_test") {
      return await handleAssignTest(args);
    }
    if (name === "watch_test") {
      return await handleWatchTest(args);
    }

    // Account: org, project and pull requests
    if (name === "get_org_details") {
      return await handleGetOrgDetails(args);
    }
    if (name === "get_project_details") {
      return await handleGetProjectDetails(args);
    }
    if (name === "get_pull_requests") {
      return await handleGetPullRequests(args);
    }

    throw new Error(`Unknown tool: ${name}`);
  };

  const validators = compileValidators(tools);

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;
    const validate = validators.get(name);
    if (!validate) {
      throw new McpError(ErrorCode.InvalidParams, `Tool ${name} not found`);
    }
    const args = { ...(request.params.arguments ?? {}) };
    applyHostedTransforms(name, args);
    const strictIssues = strictObjectIssues(name, args);
    const valid = validate(args);
    if (!valid || strictIssues.length > 0) {
      return validationErrorResult(name, [
        ...(validate.errors ?? []),
        ...strictIssues,
      ]);
    }
    try {
      // The hosted route already answers with the finished tool result.
      if (PASSTHROUGH_TOOLS.has(name)) {
        return (await dispatch(name, args)) as ToolResult;
      }
      return asHostedResult(await dispatch(name, args));
    } catch (error) {
      return errorResult(error);
    }
  });

  return server;
}
