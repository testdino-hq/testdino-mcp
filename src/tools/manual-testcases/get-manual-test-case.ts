/**
 * Get manual test case details tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetManualTestCaseArgs {
  projectId: string;
  caseId: string;
}

export const getManualTestCaseTool = {
  name: "get_manual_test_case",
  title: "Get Manual Test Case",
  description:
    'Get the full details of one manual test case: steps, preconditions, postconditions, metadata, linkedIssues, and activity (comments, version history, and execution results across all manual runs). caseId accepts either the internal _id or a human-readable ID like "TC-123". Call this before update_manual_test_case to see current steps, comments, and linked issues before modifying them. Version history and results are read-only — they reflect what happened, you cannot mutate them. Comments and linked issues are added via update_manual_test_case.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      caseId: {
        type: "string",
        description: 'Internal _id or "TC-123" style ID',
      },
    },
    required: ["projectId", "caseId"],
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

export async function handleGetManualTestCase(args?: GetManualTestCaseArgs) {
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
  if (!args?.caseId) {
    throw new Error("caseId is required");
  }

  try {
    const params = {
      projectId: String(args.projectId),
      caseId: String(args.caseId),
    };

    const getManualTestCaseUrl = endpoints.getManualTestCase(params);

    const response = await apiRequestJson<unknown>(getManualTestCaseUrl, {
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
    throw new Error(`Failed to get manual test case details: ${errorMessage}`, {
      cause: error,
    });
  }
}
