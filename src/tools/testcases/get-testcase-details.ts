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
  testrun_id?: string;
  by_fulltitle?: string;
  by_testrun_ids?: string;
  // Deprecated aliases retained for backward compatibility (mirrors streaming).
  testcaseid?: string;
  by_title?: string;
  by_testrun_id?: string;
  include_history?: boolean;
  history_limit?: number;
  steps_filter?: "failed_only";
}

export const getTestCaseDetailsTool = {
  name: "get_testcase_details",
  description:
    "Get detailed information about a specific test case. You can identify the test case in two ways: 1) By testcase_id (can be used alone), or 2) By testcase_name combined with testrun_id (required because test cases can have the same name across different test runs). Returns error message, code snippet, file location, test steps per attempt, console logs, and artifacts (screenshots, videos, traces). Use steps_filter='failed_only' to return only steps that errored, stripping passing setup/hook steps. Use this to debug why a test failed or understand how it executed. Example: 'Get test case details for \"Verify user can logout and login\" in testrun #43'.",
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
          "Test case title (partial match, case-insensitive). Must be combined with testrun_id when used alone. Example: 'Verify user can logout and login'.",
      },
      testrun_id: {
        type: "string",
        description:
          "Single test run ID to filter results. Example: 'test_run_6901b2abc6b187e63f536a6b'.",
      },
      by_fulltitle: {
        type: "string",
        description:
          "Full test case title including suite path (partial match, case-insensitive). Example: 'auth.spec.js > Login > Verify user can logout and login'.",
      },
      by_testrun_ids: {
        type: "string",
        description:
          "Multiple test run IDs (comma-separated, max 20). Example: 'test_run_abc,test_run_def'.",
      },
      testcaseid: {
        type: "string",
        description:
          "(deprecated — use testcase_id) Test case ID. Retained for backward compatibility.",
      },
      by_title: {
        type: "string",
        description:
          "(deprecated — use testcase_name) Test case title (partial match, case-insensitive). Retained for backward compatibility.",
      },
      by_testrun_id: {
        type: "string",
        description:
          "(deprecated — use testrun_id) Single test run ID to filter results. Retained for backward compatibility.",
      },
      include_history: {
        type: "boolean",
        description:
          "Include historical executions of the same test case when searching by name. Default: false.",
        default: false,
      },
      history_limit: {
        type: "number",
        description:
          "Max number of history entries to return (max: 100, default: 10).",
        default: 10,
      },
      steps_filter: {
        type: "string",
        enum: ["failed_only"],
        description:
          "Filter steps in each attempt. Use 'failed_only' to return only steps with errors, stripping passing setup and hook steps.",
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

  // Validate: need at least one identifying/search parameter. Deprecated aliases
  // (testcaseid, by_title) still count so old callers keep working.
  const hasTestCaseId = !!(args?.testcase_id || args?.testcaseid);
  const hasSearchParam = !!(
    args?.testcase_name ||
    args?.by_title ||
    args?.by_fulltitle
  );

  if (!hasTestCaseId && !hasSearchParam) {
    throw new Error(
      "At least one of the following must be provided: 'testcase_id', 'testcase_name', or 'by_fulltitle'."
    );
  }

  try {
    // Build query parameters
    const queryParams: Record<string, string> = {
      projectId: String(args.projectId),
    };

    // Primary params map to their endpoint query names.
    if (args.testcase_id) {
      queryParams.testcaseid = String(args.testcase_id);
    }
    if (args.testcase_name) {
      queryParams.by_title = String(args.testcase_name);
    }
    if (args.testrun_id) {
      queryParams.by_testrun_id = String(args.testrun_id);
    }
    if (args.by_fulltitle) {
      queryParams.by_fulltitle = String(args.by_fulltitle);
    }
    if (args.by_testrun_ids) {
      queryParams.by_testrun_ids = String(args.by_testrun_ids);
    }
    // Deprecated aliases: forward as-is under their original query names so
    // existing callers keep working. Primary params take precedence above.
    if (args.testcaseid && !queryParams.testcaseid) {
      queryParams.testcaseid = String(args.testcaseid);
    }
    if (args.by_title && !queryParams.by_title) {
      queryParams.by_title = String(args.by_title);
    }
    if (args.by_testrun_id && !queryParams.by_testrun_id) {
      queryParams.by_testrun_id = String(args.by_testrun_id);
    }
    if (args.include_history !== undefined) {
      queryParams.include_history = String(args.include_history);
    }
    if (args.history_limit !== undefined) {
      queryParams.history_limit = String(args.history_limit);
    }
    if (args.steps_filter) {
      queryParams.steps_filter = args.steps_filter;
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

    // TDV2-112: keep the tool response a single VALID STANDALONE JSON block.
    // The screenshot guidance was previously pushed as a SECOND text block after
    // the JSON, so the raw response was JSON followed by loose prose. Fold the
    // hint INTO the JSON payload instead (a `_agent_guidance` field) so the
    // response parses cleanly on its own.
    const probe = JSON.stringify(response, null, 2);
    const hasImages =
      probe.includes('"contentType": "image/') ||
      probe.includes('"screenshots"');
    const isPlainObject =
      response !== null &&
      typeof response === "object" &&
      !Array.isArray(response);

    const payload =
      hasImages && isPlainObject
        ? {
            ...(response as Record<string, unknown>),
            _agent_guidance:
              "This test case has screenshot images attached. Fetch and view the screenshot URLs (in the 'screenshots' or attachment 'path' fields) to visually inspect the application state at the time of failure — this is critical for accurate diagnosis.",
          }
        : response;

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve test case details: ${errorMessage}`);
  }
}
