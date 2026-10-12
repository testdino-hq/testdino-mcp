/**
 * Get AI Insights tool — project / run / test-case AI analysis.
 * Mirrors the streaming `get_ai_insights` tool; the level is inferred from
 * which ids are passed. Forwards to the gateway's get-ai-insights endpoint,
 * which composes the block and manages the lazy-generation lifecycle.
 */

import { endpoints } from "../../lib/endpoints.js";
import { ApiError, apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetAiInsightsArgs {
  projectId: string;
  testrun_id?: string;
  testcase_id?: string;
  environment?: string;
  dateRange?: string;
  fromDate?: string;
  toDate?: string;
}

export const getAiInsightsTool = {
  name: "get_ai_insights",
  title: "Get AI Insights",
  description:
    'TestDino\'s AI Insights, at three levels. With testrun_id + testcase_id: that test case\'s AI fixes — recommendations (investigation/remediation steps + reasoning) and quick fixes (concrete fixes, often with code snippets). With testrun_id only: that run\'s AI analysis — AI failure categorization (flaky/bug/ui_change), failure clusters, new-failures cards, the error-analysis table, and the LLM-written run summary. With neither: the project-level overview — per-category failure counts over the date range with the top offending test cases in each category. AI payloads are generated lazily: sections may report status "not_generated", "queued", "processing", or "failed" before "completed" — poll this tool every few seconds while "processing". A "disabled" status is terminal (AI features are off for the project, Settings → AI) — do not poll it. Case mode (testrun_id + testcase_id) reports "in_progress" while ai_fixes generate; the run-level sections use "processing". An "unavailable" section carries the upstream statusCode: a 5xx or timeout is transient (retry once), a 4xx (bad ids) is terminal. Use the project overview to answer "what should we fix first?"; the run mode to triage one run; the case mode to get fixes for one failing test — each also serves as the poll target after get_run_details(include_ai_insights=true) / debug_testcase(include_ai_insights=true) reported a pending status. Requires AI features to be enabled in the project settings (Settings → AI).',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      testrun_id: {
        type: "string",
        description:
          "Run mode: AI insights for this single test run. Also required for case mode (with testcase_id).",
      },
      testcase_id: {
        type: "string",
        description:
          "Case mode: with testrun_id, return AI fixes (recommendations + quick fixes) for this test case (its pw_test_id) in that run.",
      },
      environment: {
        type: "string",
        description: "Project overview only: filter by environment name",
      },
      dateRange: {
        type: "string",
        description:
          'Project overview only: e.g. "7d", "30d", or "custom" (with fromDate/toDate)',
      },
      fromDate: {
        type: "string",
        description: "Project overview only: custom range start (YYYY-MM-DD)",
      },
      toDate: {
        type: "string",
        description: "Project overview only: custom range end (YYYY-MM-DD)",
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

export async function handleGetAiInsights(args?: GetAiInsightsArgs) {
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

  // Case mode needs the run the case executed in — mirror the streaming
  // TESTRUN_ID_REQUIRED guard so the agent gets a clear error without a round-trip.
  if (args.testcase_id && !args.testrun_id) {
    const message =
      "Case mode needs both testrun_id and testcase_id — pass the run the case executed in. For the latest failing execution of a case, use debug_testcase(include_ai_insights=true) instead.";
    throw new ApiError(message, 400, {
      success: false,
      error: { code: "TESTRUN_ID_REQUIRED", message },
    });
  }

  try {
    const url = endpoints.getAiInsights({
      projectId: String(args.projectId),
      ...(args.testrun_id ? { testrun_id: String(args.testrun_id) } : {}),
      ...(args.testcase_id ? { testcase_id: String(args.testcase_id) } : {}),
      ...(args.environment ? { environment: String(args.environment) } : {}),
      ...(args.dateRange ? { dateRange: String(args.dateRange) } : {}),
      ...(args.fromDate ? { fromDate: String(args.fromDate) } : {}),
      ...(args.toDate ? { toDate: String(args.toDate) } : {}),
    });

    const response = await apiRequestJson<unknown>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve AI insights: ${errorMessage}`, {
      cause: error,
    });
  }
}
