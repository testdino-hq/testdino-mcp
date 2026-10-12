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
  title: "Get Test Case Details",
  description:
    'Get full details of a test case — errors, stack traces, steps, console logs, and artifacts. Use testcase_id (the Playwright pw_test_id) for the most precise lookup; it can be used alone for latest detail or paired with testrun_id for exact run-scoped detail. testcase_name resolves through test history; combine it with testrun_id to scope to specific run(s), otherwise the latest run is used. Always pass steps_filter="failed_only" when debugging — it drops unrelated passing setup/hook steps and keeps failed branches plus required parent context, cutting noise significantly. Every stored artifact comes back in `evidence[]` — trace, video, screenshots, and for a visual failure the expected/actual/diff images — each with its attempt index, a `url`, and an `expires_at`. Download what you need as soon as you receive it: the links are minutes-scale by design. If one has expired, call this tool again to mint fresh links rather than treating the artifact as missing. `traceDownloadUrl` points at the first FAILING attempt, which on a flaky test is not the last one.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      testcase_id: {
        type: "string",
        description:
          "Exact test case ID(s) — Playwright pw_test_id, comma-separated (max 50).",
      },
      testcase_name: {
        type: "string",
        description:
          "Test case title — resolves through test history; scoped by testrun_id when given, else latest matching detail.",
      },
      testrun_id: {
        type: "string",
        description:
          "Run scope for testcase_id / testcase_name lookup. Comma-separated (max 20).",
      },
      testcaseid: {
        type: "string",
        description:
          "Deprecated alias for testcase_id (kept for backward compatibility).",
      },
      by_title: {
        type: "string",
        description:
          "Deprecated alias for testcase_name (kept for backward compatibility).",
      },
      by_testrun_id: {
        type: "string",
        description:
          "Deprecated alias for testrun_id (kept for backward compatibility).",
      },
      by_fulltitle: {
        type: "string",
      },
      by_testrun_ids: {
        type: "string",
        description: "Comma-separated (max 20)",
      },
      include_history: {
        type: "boolean",
        description:
          "Attach DH /analytics/test-history output to returned case detail items.",
      },
      history_limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description:
          "Maximum history timeline cells to keep when include_history=true.",
      },
      steps_filter: {
        type: "string",
        enum: ["failed_only"],
        description: 'Use "failed_only" to drop passing setup/hook steps',
      },
    },
    required: ["projectId"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
  },
  execution: {
    taskSupport: "forbidden",
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

  try {
    // The server resolves aliases and missing identifiers, exactly as it does
    // for the hosted tool; every argument goes as given.
    const queryParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(args ?? {})) {
      if (
        key !== "token" &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        queryParams[key] = String(value);
      }
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

    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve test case details: ${errorMessage}`, {
      cause: error,
    });
  }
}
