/**
 * Debug test case tool for AI-assisted failure analysis
 * Fetches historical test case data and debugging prompt from the API
 * The AI client handles aggregation, pattern detection, and root cause analysis
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface DebugTestCaseArgs {
  projectId: string;
  testcase_name: string;
}

export const debugTestCaseTool = {
  name: "debug_testcase",
  description:
    "Fetch historical execution and failure data for a specific test case. Returns raw historical data and a debugging prompt from the API. The AI client will analyze the data to identify failure patterns, find root causes, and provide fix suggestions. Use this when you need to debug a failing test case. Example: 'Debug test case \"Verify user login\"'.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description:
          "Project ID (Required). The TestDino project identifier.",
      },
      testcase_name: {
        type: "string",
        description:
          "Test case name/title to debug (Required). Example: 'Verify user can logout and login'.",
      },
    },
    required: ["projectId", "testcase_name"],
  },
};


export async function handleDebugTestCase(args?: DebugTestCaseArgs) {
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

  if (!args?.testcase_name) {
    throw new Error("testcase_name is required");
  }

  try {
    // Call the debug endpoint - API returns historical data and debugging_prompt
    const debugUrl = endpoints.debugTestCase({
      projectId: String(args.projectId),
      testcase_name: String(args.testcase_name),
    });

    const response = await apiRequestJson<unknown>(debugUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Return the API response as-is (includes historical data and debugging_prompt)
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
    throw new Error(`Failed to debug test case: ${errorMessage}`);
  }
}

