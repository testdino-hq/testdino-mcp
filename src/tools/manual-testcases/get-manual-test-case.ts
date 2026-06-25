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
  annotations: { readOnlyHint: true },
  description:
    "Retrieve detailed information of a single manual test case, including steps, custom fields, preconditions, and all metadata. " +
    "Activity is included inline: `comments` (latest), `versions` (latest 20 of the version history), `results` (latest 100 execution results across every manual run that ran this case), and `linkedIssues` (Jira tickets linked to the case). " +
    "`versions` and `results` are READ-ONLY — they reflect what happened, you cannot mutate them. " +
    "Use update_manual_test_case to add comments (updates.comments) or link issues (updates.issues).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      caseId: {
        type: "string",
        description:
          "Test case ID (Required). Can be internal _id or human-readable ID like 'TC-123'.",
      },
    },
    required: ["projectId", "caseId"],
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
    throw new Error(`Failed to get manual test case details: ${errorMessage}`);
  }
}
