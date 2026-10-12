/**
 * Debug test case tool for AI-assisted failure analysis
 * Fetches historical test case data and debugging prompt from the API
 * The AI client handles aggregation, pattern detection, and root cause analysis
 */

import { endpoints } from "../../lib/endpoints.js";
import { ApiError, apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface DebugTestCaseArgs {
  projectId: string;
  testcase_id?: string;
  testcase_name?: string;
  suite_file_path?: string;
  include_ai_insights?: boolean;
  testrun_id?: string;
}

export const debugTestCaseTool = {
  name: "debug_testcase",
  title: "Debug Test Case",
  description:
    'AI-assisted root cause analysis for a failing or flaky test. Returns historical execution data, aggregated failure patterns (error types, frequency, browsers affected), common error messages, and a debugging_prompt field. If you are debugging a failing test, call get_debug_evidence first: it already carries the debugging_prompt, the verdict and the artifact links. Come here afterwards only for the stored AI suggestions or the full execution history. IMPORTANT: always read the debugging_prompt field in the response — it contains pre-formatted analysis instructions curated for this specific test. Treat it as your analysis context before drawing conclusions. Any fixes you produce from this analysis are recommendations only — validate them against the live code before applying. Use this when the user asks "why is test X failing?", "debug test X", or "is test X flaky?". Identify the test by testcase_id (its pw_test_id, exact) or testcase_name (its title). A title can match several tests (the same test under several Playwright projects, or the same title in several files): pair it with suite_file_path, and if the response is 409 AMBIGUOUS_IDENTITY, its candidates name the Playwright project of each — call again with testcase_id set to the pw_test_id of the one you mean. Set include_ai_insights=true to also get TestDino\'s stored AI analysis for this test under `ai_fixes`: recommendations (investigation/remediation steps + reasoning + historical insight) and quick fixes (concrete fixes, often with code snippets, plus long-term stabilization steps). By default they target the most recent failing execution; pass testrun_id to target a specific run. AI payloads are generated lazily — if `ai_fixes` sections report status "in_progress", poll get_ai_insights(testrun_id=..., testcase_id=...) until they report "completed". An "unavailable" section carries the upstream statusCode: a 5xx or timeout is transient (retry once via get_ai_insights); a 4xx (bad ids) is terminal. Workflow: this returns the long history across runs. If you are diagnosing a failure rather than surveying a pattern, get_debug_evidence is the first call — it returns this history alongside the verdict, the regression boundary and every artifact link, so starting here costs extra round trips for the same evidence.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      testcase_name: {
        type: "string",
        description:
          "Test case name / title to debug. Required unless testcase_id is given.",
      },
      testcase_id: {
        type: "string",
        description:
          "The test's pw_test_id — exact, never ambiguous. Wins over testcase_name and suite_file_path.",
      },
      suite_file_path: {
        type: "string",
        description:
          'Optional spec file path — disambiguates when several tests share the same title. Example: "tests/checkout.spec.ts".',
      },
      include_ai_insights: {
        type: "boolean",
        description:
          "Attach AI recommendations + quick fixes for this test under `ai_fixes` (targets the most recent failing execution unless testrun_id is set).",
      },
      testrun_id: {
        type: "string",
        description:
          "Only with include_ai_insights: fetch the AI analysis for this specific run instead of the most recent failure.",
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

export async function handleDebugTestCase(args?: DebugTestCaseArgs) {
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT (PAT) environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  if (!args?.testcase_id && !args?.testcase_name) {
    throw new ApiError(
      "Provide testcase_id (the pw_test_id) or testcase_name.",
      400,
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Provide testcase_id (the pw_test_id) or testcase_name.",
        },
      }
    );
  }

  try {
    // Call the debug endpoint - API returns historical data and debugging_prompt
    const debugUrl = endpoints.debugTestCase({
      projectId: String(args.projectId),
      ...(args.testcase_id ? { testcase_id: String(args.testcase_id) } : {}),
      ...(args.testcase_name
        ? { testcase_name: String(args.testcase_name) }
        : {}),
      ...(args.suite_file_path
        ? { suite_file_path: String(args.suite_file_path) }
        : {}),
      ...(args.include_ai_insights === true
        ? { include_ai_insights: true }
        : {}),
      ...(args.testrun_id ? { testrun_id: String(args.testrun_id) } : {}),
    });

    const response = await apiRequestJson<unknown>(debugUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to debug test case: ${errorMessage}`, {
      cause: error,
    });
  }
}
