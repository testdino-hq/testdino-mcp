/**
 * List manual test suites tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListManualTestSuitesArgs {
  projectId: string;
  parentSuiteId?: string;
}

interface ListManualTestSuitesParams {
  projectId: string;
  parentSuiteId?: string;
}

export const listManualTestSuitesTool = {
  name: "list_manual_test_suites",
  description:
    "List the test suite hierarchy to help users find suiteIds for test case creation. Use this to navigate the test suite structure and understand test organization.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      parentSuiteId: {
        type: "string",
        description:
          "Optional parent suite ID to fetch only children of a specific suite. If not provided, returns the root-level suites.",
      },
    },
    required: ["projectId"],
  },
};

export async function handleListManualTestSuites(
  args?: ListManualTestSuitesArgs
) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  // Validate required parameter
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  try {
    const params: ListManualTestSuitesParams = {
      projectId: String(args.projectId),
    };

    // Add optional parent suite filter
    if (args?.parentSuiteId) {
      params.parentSuiteId = String(args.parentSuiteId);
    }

    const listManualTestSuitesUrl = endpoints.listManualTestSuites(params);

    const response = await apiRequestJson<unknown>(listManualTestSuitesUrl, {
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
    throw new Error(`Failed to list manual test suites: ${errorMessage}`);
  }
}
