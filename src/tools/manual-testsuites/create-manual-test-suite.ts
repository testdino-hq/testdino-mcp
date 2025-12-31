/**
 * Create manual test suite tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface CreateManualTestSuiteArgs {
  projectId: string;
  name: string;
  parentSuiteId?: string;
}

interface CreateManualTestSuiteBody {
  projectId: string;
  name: string;
  parentSuiteId?: string;
}

export const createManualTestSuiteTool = {
  name: "create_manual_test_suite",
  description:
    "Create a new test suite folder to organize test cases. Use this to create a logical grouping for related test cases. Suites can be nested by providing a parentSuiteId.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      name: {
        type: "string",
        description:
          "Suite name (Required). A descriptive name for the test suite.",
      },
      parentSuiteId: {
        type: "string",
        description:
          "Optional parent suite ID to create this suite as a child of another suite. If not provided, creates a root-level suite.",
      },
    },
    required: ["projectId", "name"],
  },
};

export async function handleCreateManualTestSuite(
  args?: CreateManualTestSuiteArgs
) {
  // Read API key from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_API_KEY environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  // Validate required parameters
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }
  if (!args?.name) {
    throw new Error("name is required");
  }

  try {
    const body: CreateManualTestSuiteBody = {
      projectId: String(args.projectId),
      name: String(args.name),
    };

    // Add optional parent suite
    if (args?.parentSuiteId) {
      body.parentSuiteId = String(args.parentSuiteId);
    }

    const createManualTestSuiteUrl = endpoints.createManualTestSuite(
      String(args.projectId)
    );

    const response = await apiRequestJson<unknown>(createManualTestSuiteUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
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
    throw new Error(`Failed to create manual test suite: ${errorMessage}`);
  }
}
