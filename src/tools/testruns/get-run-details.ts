/**
 * Get run details tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetRunDetailsArgs {
  projectId: string;
  testrun_id?: string;
  counter?: string | number;
  include_ai_insights?: boolean;
}

interface GetRunDetailsParams {
  projectId: string;
  testrun_id?: string;
  counter?: string | number;
  include_ai_insights?: boolean;
}

export const getRunDetailsTool = {
  name: "get_run_details",
  title: "Get Test Run Details",
  description:
    'Get the full breakdown of one or more test runs — test statistics, error category breakdown, suite list, and all test cases in the run. Use testrun_id for ID-based lookup or counter for the human-readable run number (e.g. counter="47"). Batch up to 20 runs by comma-separating: testrun_id="id1,id2,id3". Typical workflow: list_testruns() → pick IDs → get_run_details() for the specific run. Set include_ai_insights=true (single testrun_id only) to also get the run\'s AI Insights under `ai_insights`: AI failure categorization (flaky/bug/ui_change), failure clusters, new-failures cards, the error-analysis table, and the LLM-written run summary. AI payloads are generated lazily — if `ai_insights` sections report status "processing"/"not_generated", poll get_ai_insights(testrun_id=...) until "completed" instead of re-calling this tool. An "unavailable" section carries the upstream statusCode: a 5xx or timeout is transient (retry once via get_ai_insights), a 4xx (bad ids) is terminal.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      testrun_id: {
        type: "string",
        description: "Single test run ID, or comma-separated IDs (max 20)",
      },
      counter: {
        type: ["string", "number"],
        description:
          'Run counter. Number for a single run (e.g. 47), or comma-separated string ("47,48,49", max 20) for batch lookup.',
      },
      include_ai_insights: {
        type: "boolean",
        description:
          "Attach the run's AI Insights (categorization, clusters, error-analysis table, written summary) under `ai_insights`. Requires a single testrun_id (not counter, not a batch).",
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

export async function handleGetRunDetails(args?: GetRunDetailsArgs) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
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
      // Forward as-is: a number stays a number (single run), a string stays a
      // string (comma-separated batch). Do NOT coerce with Number() — that would
      // turn "47,48" into NaN and drop the batch.
      params.counter = args.counter;
    }

    if (args.include_ai_insights === true) {
      params.include_ai_insights = true;
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
    throw new Error(`Failed to retrieve test run details: ${errorMessage}`, {
      cause: error,
    });
  }
}
