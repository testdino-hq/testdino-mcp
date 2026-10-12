/**
 * Create manual test suite tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface CreateManualTestSuiteArgs {
  projectId: string;
  name: string;
  description?: string;
  parentSuiteId?: string;
}

interface CreateManualTestSuiteBody {
  projectId: string;
  name: string;
  description?: string;
  parentSuiteId?: string;
}

export const createManualTestSuiteTool = {
  name: "create_manual_test_suite",
  title: "Create Manual Test Suite",
  description:
    "Create a new test suite folder for organizing manual test cases. Requires write permission. Use parentSuiteId to nest it under an existing suite — get the ID from list_manual_test_suites() first.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      name: {
        type: "string",
        maxLength: 500,
        description: "Suite name",
      },
      parentSuiteId: {
        type: "string",
      },
      description: {
        type: "string",
      },
    },
    required: ["projectId", "name"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  execution: {
    taskSupport: "forbidden",
  },
};

export async function handleCreateManualTestSuite(
  args?: CreateManualTestSuiteArgs
) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
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

    // Add optional fields
    if (args?.description) {
      body.description = String(args.description);
    }
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
    throw new Error(`Failed to create manual test suite: ${errorMessage}`, {
      cause: error,
    });
  }
}
