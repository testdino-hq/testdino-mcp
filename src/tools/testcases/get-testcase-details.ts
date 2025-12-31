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
  counter?: number;
}

export const getTestCaseDetailsTool = {
  name: "get_testcase_details",
  description:
    "Get detailed information about a specific test case. You can identify the test case in two ways: 1) By testcase_id (can be used alone), or 2) By testcase_name combined with testrun_id or counter (required because test cases can have the same name across different test runs). Shows error messages, stack traces, test steps, console logs, and optional artifacts (screenshots, videos, traces). Use this to debug why a test failed or understand how it executed. Example: 'Get test case details for \"Verify user can logout and login\" in testrun #43'.",
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
          "Test case name/title. Must be combined with either testrun_id or counter to identify which test run's test case you want. Example: 'Verify user can logout and login'.",
      },
      testrun_id: {
        type: "string",
        description:
          "Test run ID. Required when using testcase_name to specify which test run's test case you want. Example: 'test_run_6901b2abc6b187e63f536a6b'.",
      },
      counter: {
        type: "number",
        description:
          "Test run counter number. Required when using testcase_name (if testrun_id is not provided) to specify which test run's test case you want. Example: 43.",
      },
    },
    required: ["projectId"],
  },
};

export async function handleGetTestCaseDetails(args?: GetTestCaseDetailsArgs) {
  // Read API key from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_API_KEY environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  // Validate parameters
  const hasTestCaseId = !!args?.testcase_id;
  const hasTestCaseName = !!args?.testcase_name;
  const hasTestRunId = !!args?.testrun_id;
  const hasCounter = args?.counter !== undefined;

  // Must have either testcase_id alone, or testcase_name with testrun_id or counter
  if (!hasTestCaseId && !hasTestCaseName) {
    throw new Error(
      "Either 'testcase_id' or 'testcase_name' must be provided. " +
        "If using 'testcase_name', you must also provide either 'testrun_id' or 'counter' to specify which test run's test case you want."
    );
  }

  if (hasTestCaseName && !hasTestRunId && !hasCounter) {
    throw new Error(
      "When using 'testcase_name', you must also provide either 'testrun_id' or 'counter' to specify which test run's test case you want. " +
        "This is required because test cases can have the same name across different test runs."
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
    if (args.testrun_id) {
      queryParams.by_testrun_id = String(args.testrun_id);
    }
    if (args.counter !== undefined) {
      queryParams.counter = String(args.counter);
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
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve test case details: ${errorMessage}`);
  }
}
