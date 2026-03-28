/**
 * Get test case details tool with flexible search capabilities
 */
import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetTestCaseDetailsArgs {
  projectId: string;
  testcase_id?: string;
  testcase_name?: string;
  testcase_fulltitle?: string;
  testrun_id?: string;
  testrun_ids?: string;
  testsuite_id?: string;
  counter?: number;
  by_status?: "passed" | "failed" | "skipped" | "flaky";
  by_error_message?: string;
  by_code_snippet?: string;
  include_history?: boolean;
  history_limit?: number;
  include_artifacts?: boolean;
  include_screenshots?: boolean;
  include_traces?: boolean;
  include_videos?: boolean;
  include_attachments?: boolean;
  steps_filter?: "failed_only";
  limit?: number;
  page?: number;
  sort_by?: "startTime" | "duration";
  sort_order?: "asc" | "desc";
  get_all?: boolean;
}

export const getTestCaseDetailsTool = {
  name: "get_testcase_details",
  description:
    "Get detailed information about a specific test case. You can identify the test case in two ways: 1) By testcase_id (can be used alone), or 2) By testcase_name combined with testrun_id or counter (required because test cases can have the same name across different test runs). Returns error message, code snippet, file location, test steps per attempt, console logs, and optional artifacts (screenshots, videos, traces). Use steps_filter='failed_only' to return only steps that errored, stripping passing setup/hook steps. Use this to debug why a test failed or understand how it executed. Example: 'Get test case details for \"Verify user can logout and login\" in testrun #43'.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      testcase_id: {
        type: "string",
        description:
          "Test case ID. Can be used alone to get test case details. Example: 'test_case_123'.",
      },
      testcase_name: {
        type: "string",
        description:
          "Test case title (partial match, case-insensitive). Must be combined with testrun_id or counter when used alone. Example: 'Verify user can logout and login'.",
      },
      testcase_fulltitle: {
        type: "string",
        description:
          "Full test case title including suite path (partial match, case-insensitive). Example: 'auth.spec.js > Login > Verify user can logout and login'.",
      },
      testrun_id: {
        type: "string",
        description:
          "Single test run ID to filter results. Example: 'test_run_6901b2abc6b187e63f536a6b'.",
      },
      testrun_ids: {
        type: "string",
        description:
          "Multiple test run IDs (comma-separated, max 20). Example: 'test_run_abc,test_run_def'.",
      },
      testsuite_id: {
        type: "string",
        description: "Filter by test suite ID.",
      },
      counter: {
        type: "number",
        description:
          "Test run counter number. Alternative to testrun_id to identify the test run. Example: 43.",
      },
      by_status: {
        type: "string",
        enum: ["passed", "failed", "skipped", "flaky"],
        description: "Filter by test case status.",
      },
      by_error_message: {
        type: "string",
        description:
          "Search in error messages (partial match, case-insensitive). Example: 'Timeout 15000ms exceeded'.",
      },
      by_code_snippet: {
        type: "string",
        description:
          "Search in error code snippets (partial match, case-insensitive).",
      },
      include_history: {
        type: "boolean",
        description:
          "Include historical executions of the same test case when searching by name. Default: false.",
        default: false,
      },
      history_limit: {
        type: "number",
        description: "Max number of history entries to return (default: 10).",
        default: 10,
      },
      include_artifacts: {
        type: "boolean",
        description:
          "Include all artifacts (screenshots, traces, videos, attachments) with authenticated URLs. Default: false.",
        default: false,
      },
      include_screenshots: {
        type: "boolean",
        description:
          "Include screenshot URLs from test attempts. Default: false.",
        default: false,
      },
      include_traces: {
        type: "boolean",
        description:
          "Include Playwright trace links from test attempts. Default: false.",
        default: false,
      },
      include_videos: {
        type: "boolean",
        description:
          "Include video recording URLs from test attempts. Default: false.",
        default: false,
      },
      include_attachments: {
        type: "boolean",
        description:
          "Include all attachment metadata from test attempts. Default: false.",
        default: false,
      },
      steps_filter: {
        type: "string",
        enum: ["failed_only"],
        description:
          "Filter steps in each attempt. Use 'failed_only' to return only steps with errors, stripping passing setup and hook steps.",
      },
      limit: {
        type: "number",
        description:
          "Max results to return (default: 1 for ID lookup, 50 for search, max: 1000).",
      },
      page: {
        type: "number",
        description: "Page number for pagination (default: 1).",
        default: 1,
      },
      sort_by: {
        type: "string",
        enum: ["startTime", "duration"],
        description: "Sort results by field (default: startTime).",
      },
      sort_order: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort direction (default: desc).",
      },
      get_all: {
        type: "boolean",
        description: "Return all matching results up to 1000 (default: false).",
        default: false,
      },
    },
    required: ["projectId"],
  },
};

export async function handleGetTestCaseDetails(args?: GetTestCaseDetailsArgs) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  // Validate: need at least one search parameter
  const hasTestCaseId = !!args?.testcase_id;
  const hasSearchParam = !!(
    args?.testcase_name ||
    args?.testcase_fulltitle ||
    args?.by_error_message ||
    args?.by_code_snippet ||
    args?.by_status
  );

  if (!hasTestCaseId && !hasSearchParam) {
    throw new Error(
      "At least one of the following must be provided: 'testcase_id', 'testcase_name', 'testcase_fulltitle', 'by_error_message', or 'by_code_snippet'."
    );
  }

  try {
    // Build query parameters
    const queryParams: Record<string, string> = {
      projectId: String(args.projectId),
    };

    if (args.testcase_id) {
      queryParams.testcaseid = String(args.testcase_id);
    }
    if (args.testcase_name) {
      queryParams.by_title = String(args.testcase_name);
    }
    if (args.testcase_fulltitle) {
      queryParams.by_fulltitle = String(args.testcase_fulltitle);
    }
    if (args.testrun_id) {
      queryParams.by_testrun_id = String(args.testrun_id);
    }
    if (args.testrun_ids) {
      queryParams.by_testrun_ids = String(args.testrun_ids);
    }
    if (args.testsuite_id) {
      queryParams.by_testsuite_id = String(args.testsuite_id);
    }
    if (args.counter !== undefined) {
      queryParams.counter = String(args.counter);
    }
    if (args.by_status) {
      queryParams.by_status = args.by_status;
    }
    if (args.by_error_message) {
      queryParams.by_error_message = String(args.by_error_message);
    }
    if (args.by_code_snippet) {
      queryParams.by_code_snippet = String(args.by_code_snippet);
    }
    if (args.include_history !== undefined) {
      queryParams.include_history = String(args.include_history);
    }
    if (args.history_limit !== undefined) {
      queryParams.history_limit = String(args.history_limit);
    }
    if (args.include_artifacts !== undefined) {
      queryParams.include_artifacts = String(args.include_artifacts);
    }
    if (args.include_screenshots !== undefined) {
      queryParams.include_screenshots = String(args.include_screenshots);
    }
    if (args.include_traces !== undefined) {
      queryParams.include_traces = String(args.include_traces);
    }
    if (args.include_videos !== undefined) {
      queryParams.include_videos = String(args.include_videos);
    }
    if (args.include_attachments !== undefined) {
      queryParams.include_attachments = String(args.include_attachments);
    }
    if (args.steps_filter) {
      queryParams.steps_filter = args.steps_filter;
    }
    if (args.limit !== undefined) {
      queryParams.limit = String(args.limit);
    }
    if (args.page !== undefined) {
      queryParams.page = String(args.page);
    }
    if (args.sort_by) {
      queryParams.sort_by = args.sort_by;
    }
    if (args.sort_order) {
      queryParams.sort_order = args.sort_order;
    }
    if (args.get_all !== undefined) {
      queryParams.get_all = String(args.get_all);
    }

    // Build URL with query parameters using endpoints helper
    const testCaseDetailsUrl = endpoints.getTestCaseDetails(
      queryParams as Parameters<typeof endpoints.getTestCaseDetails>[0]
    );

    const response = await apiRequestJson<unknown>(testCaseDetailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = JSON.stringify(response, null, 2);
    const content: Array<{ type: string; text: string }> = [
      { type: "text", text: responseText },
    ];

    // If response contains screenshot/image attachments, instruct the agent to view them
    if (
      responseText.includes('"contentType": "image/') ||
      responseText.includes('"screenshots"')
    ) {
      content.push({
        type: "text",
        text: "This test case has screenshot images attached. You should fetch and view the screenshot URLs above (in the 'screenshots' or attachment 'path' fields) to visually inspect the application state at the time of failure — this is critical for accurate diagnosis.",
      });
    }

    return { content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve test case details: ${errorMessage}`);
  }
}
