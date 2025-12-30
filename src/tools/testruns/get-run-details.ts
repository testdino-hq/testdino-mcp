/**
 * Get run details tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetRunDetailsArgs {
  projectId: string;
  testrun_id?: string;
  counter?: number;
}

interface GetRunDetailsParams {
  projectId: string;
  testrun_id?: string;
  counter?: number;
}

export const getRunDetailsTool = {
  name: "get_run_details",
  description:
    "Get detailed information about test runs. Shows test statistics (passed, failed, skipped, flaky), all test suites and cases, git metadata, and error details. Supports batch operations (comma-separated IDs, max 20). Use this to analyze test execution health or debug specific failures.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      testrun_id: {
        type: "string",
        description:
          "Test run ID(s). Single ID or comma-separated for batch (max 20). Example: 'test_run_123' or 'run1,run2,run3'.",
      },
      counter: {
        type: "number",
        description: "Filter by test run counter (sequential number).",
      },
    },
    required: ["projectId"],
  },
};

export async function handleGetRunDetails(args?: GetRunDetailsArgs) {
  // Read API key from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_API_KEY environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  try {
    // Build query parameters
    const params: GetRunDetailsParams = {
      projectId: String(args.projectId),
    };

    if (args.testrun_id) {
      params.testrun_id = String(args.testrun_id);
    }

    if (args.counter !== undefined) {
      params.counter = Number(args.counter);
    }

    const runDetailsUrl = endpoints.getRunDetails(params);

    const response = await apiRequestJson<unknown>(runDetailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Always return output directly as text content, never write to file
    // This ensures the output is displayed directly regardless of size
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
    throw new Error(`Failed to retrieve test run details: ${errorMessage}`);
  }
}
